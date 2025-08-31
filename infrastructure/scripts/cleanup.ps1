# PowerShell script to clean up Azure resources
param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$WhatIf = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Function to write colored output
function Write-ColorOutput($ForegroundColor) {
    $FC = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    
    $host.UI.RawUI.ForegroundColor = $FC
}

Write-ColorOutput Red "🗑️  Azure Resource Cleanup Script"
Write-ColorOutput Yellow "Resource Group: $ResourceGroupName"
Write-ColorOutput Yellow "Subscription: $SubscriptionId"

if ($WhatIf) {
    Write-ColorOutput Yellow "🔍 Running in what-if mode (no resources will be deleted)"
}

# Check if Azure CLI is installed
try {
    az version --output table 2>$null | Out-Null
    Write-ColorOutput Green "✅ Azure CLI is installed"
} catch {
    Write-ColorOutput Red "❌ Azure CLI is not installed"
    exit 1
}

# Login check
$loginCheck = az account show 2>$null
if (-not $loginCheck) {
    Write-ColorOutput Yellow "⚠️  Not logged in to Azure. Initiating login..."
    az login
}

# Set subscription
az account set --subscription $SubscriptionId

# Check if resource group exists
$rgExists = az group exists --name $ResourceGroupName
if ($rgExists -eq "false") {
    Write-ColorOutput Yellow "⚠️  Resource group '$ResourceGroupName' does not exist"
    exit 0
}

# List resources in the resource group
Write-ColorOutput Yellow "🔍 Listing resources in resource group..."
$resources = az resource list --resource-group $ResourceGroupName --output json | ConvertFrom-Json

if ($resources.Count -eq 0) {
    Write-ColorOutput Yellow "⚠️  No resources found in resource group"
    if (-not $WhatIf) {
        Write-ColorOutput Yellow "🗑️  Deleting empty resource group..."
        az group delete --name $ResourceGroupName --yes
        Write-ColorOutput Green "✅ Resource group deleted"
    }
    exit 0
}

Write-ColorOutput Red "📋 Resources to be deleted:"
foreach ($resource in $resources) {
    Write-ColorOutput White "  - $($resource.name) ($($resource.type))"
}

if (-not $Force -and -not $WhatIf) {
    $confirmation = Read-Host "Are you sure you want to delete these resources? Type 'DELETE' to confirm"
    if ($confirmation -ne "DELETE") {
        Write-ColorOutput Yellow "❌ Deletion cancelled by user"
        exit 0
    }
}

if ($WhatIf) {
    Write-ColorOutput Yellow "🔍 What-if mode: Would delete $($resources.Count) resources and the resource group"
} else {
    Write-ColorOutput Red "🗑️  Deleting resource group and all resources..."
    az group delete --name $ResourceGroupName --yes --no-wait
    Write-ColorOutput Green "✅ Deletion initiated (running in background)"
    Write-ColorOutput Yellow "⏱️  Use 'az group show --name $ResourceGroupName' to check deletion status"
}

Write-ColorOutput Green "✨ Cleanup script completed!"