# PowerShell deployment script for Azure infrastructure
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment,
    
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "East US",
    
    [Parameter(Mandatory=$false)]
    [string]$KeyVaultAccessObjectId,
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceSuffix,
    
    [Parameter(Mandatory=$false)]
    [switch]$WhatIf = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Function to write colored output
function Write-ColorOutput($ForegroundColor) {
    # Save current color
    $FC = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    
    # Output
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    
    # Restore original color
    $host.UI.RawUI.ForegroundColor = $FC
}

Write-ColorOutput Green "Starting Azure infrastructure deployment for environment: $Environment"

# Check if Azure CLI is installed
try {
    $azVersion = az version --output table 2>$null
    Write-ColorOutput Green "Azure CLI is installed"
} catch {
    Write-ColorOutput Red "Azure CLI is not installed. Please install Azure CLI first."
    exit 1
}

# Check if Bicep CLI is installed
try {
    $bicepVersion = az bicep version 2>$null
    Write-ColorOutput Green "Bicep CLI is installed"
} catch {
    Write-ColorOutput Yellow "Bicep CLI not found. Installing..."
    az bicep install
    Write-ColorOutput Green "Bicep CLI installed"
}

# Login to Azure if not already logged in
Write-ColorOutput Yellow "Checking Azure login status..."
$loginCheck = az account show 2>$null
if (-not $loginCheck) {
    Write-ColorOutput Yellow "Not logged in to Azure. Initiating login..."
    az login
} else {
    Write-ColorOutput Green "Already logged in to Azure"
}

# Set subscription
Write-ColorOutput Yellow "Setting Azure subscription to: $SubscriptionId"
az account set --subscription $SubscriptionId
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "Failed to set subscription"
    exit 1
}

# Check if resource group exists, create if not
Write-ColorOutput Yellow "Checking if resource group exists: $ResourceGroupName"
$rgExists = az group exists --name $ResourceGroupName
if ($rgExists -eq "false") {
    Write-ColorOutput Yellow "Resource group does not exist. Creating..."
    az group create --name $ResourceGroupName --location $Location
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput Red "Failed to create resource group"
        exit 1
    }
    Write-ColorOutput Green "Resource group created"
} else {
    Write-ColorOutput Green "Resource group already exists"
}

# Get current user's object ID if not provided
if (-not $KeyVaultAccessObjectId) {
    Write-ColorOutput Yellow "Getting current user's object ID for Key Vault access..."
    $currentUser = az ad signed-in-user show --query objectId --output tsv
    $KeyVaultAccessObjectId = $currentUser
    Write-ColorOutput Green "Using object ID: $KeyVaultAccessObjectId"
}

# Prepare deployment parameters
$bicepFile = Join-Path $PSScriptRoot "..\bicep\main.bicep"
$parametersFile = Join-Path $PSScriptRoot "..\bicep\main.$Environment.bicepparam"

# Check if files exist
if (-not (Test-Path $bicepFile)) {
    Write-ColorOutput Red "Bicep template file not found: $bicepFile"
    exit 1
}

if (-not (Test-Path $parametersFile)) {
    Write-ColorOutput Red "Parameters file not found: $parametersFile"
    exit 1
}

# Build deployment command
$deploymentName = "meal-planner-$Environment-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$deployCmd = @(
    "az", "deployment", "group", "create"
    "--resource-group", $ResourceGroupName
    "--name", $deploymentName
    "--template-file", $bicepFile
    "--parameters", $parametersFile
    "--parameters", "keyVaultAccessObjectId=$KeyVaultAccessObjectId"
)

# Add optional parameters
if ($ResourceSuffix -and $ResourceSuffix.Trim() -ne "") {
    $deployCmd += "--parameters", "resourceSuffix=$ResourceSuffix"
}

# Add what-if flag if specified
if ($WhatIf) {
    $deployCmd += "--what-if"
    Write-ColorOutput Yellow "Running deployment validation (what-if mode)..."
} else {
    Write-ColorOutput Yellow "Starting deployment..."
}

# Execute deployment
Write-ColorOutput Green "Executing command: $($deployCmd -join ' ')"
& $deployCmd[0] $deployCmd[1..($deployCmd.Length-1)]

if ($LASTEXITCODE -eq 0) {
    if ($WhatIf) {
        Write-ColorOutput Green "What-if validation completed successfully"
    } else {
        Write-ColorOutput Green "Deployment completed successfully!"
        
        # Get deployment outputs
        Write-ColorOutput Yellow "Getting deployment outputs..."
        $outputs = az deployment group show --resource-group $ResourceGroupName --name $deploymentName --query properties.outputs --output json | ConvertFrom-Json
        
        Write-ColorOutput Green "Deployment Outputs:"
        Write-ColorOutput White "Static Web App URL: $($outputs.staticWebAppUrl.value)"
        Write-ColorOutput White "Function App URL: $($outputs.functionAppUrl.value)"
        Write-ColorOutput White "Cosmos DB Endpoint: $($outputs.cosmosDbEndpoint.value)"
        Write-ColorOutput White "OpenAI Endpoint: $($outputs.openAiEndpoint.value)"
        Write-ColorOutput White "Key Vault URI: $($outputs.keyVaultUri.value)"
        Write-ColorOutput White "Resource Group: $($outputs.resourceGroupName.value)"
    }
} else {
    Write-ColorOutput Red "Deployment failed"
    exit 1
}

Write-ColorOutput Green "Script completed successfully!"