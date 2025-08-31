#!/bin/bash
# Bash deployment script for Azure infrastructure

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local color=$1
    shift
    echo -e "${color}$@${NC}"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 --environment <dev|staging|prod> --subscription-id <subscription-id> --resource-group <resource-group-name> [options]"
    echo ""
    echo "Required arguments:"
    echo "  --environment             Environment to deploy to (dev, staging, prod)"
    echo "  --subscription-id         Azure subscription ID"
    echo "  --resource-group          Resource group name"
    echo ""
    echo "Optional arguments:"
    echo "  --location                Azure region (default: East US)"
    echo "  --keyvault-access-id      Object ID for Key Vault access (default: current user)"
    echo "  --resource-suffix         Unique suffix for resource names (4 chars max)"
    echo "  --what-if                 Run deployment validation only"
    echo "  --help                    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --environment dev --subscription-id 12345678-1234-1234-1234-123456789012 --resource-group rg-meal-planner-dev"
    echo "  $0 --environment prod --subscription-id 12345678-1234-1234-1234-123456789012 --resource-group rg-meal-planner-prod --resource-suffix test"
}

# Parse command line arguments
ENVIRONMENT=""
SUBSCRIPTION_ID=""
RESOURCE_GROUP_NAME=""
LOCATION="East US"
KEYVAULT_ACCESS_OBJECT_ID=""
RESOURCE_SUFFIX=""
WHAT_IF=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --subscription-id)
            SUBSCRIPTION_ID="$2"
            shift 2
            ;;
        --resource-group)
            RESOURCE_GROUP_NAME="$2"
            shift 2
            ;;
        --location)
            LOCATION="$2"
            shift 2
            ;;
        --keyvault-access-id)
            KEYVAULT_ACCESS_OBJECT_ID="$2"
            shift 2
            ;;
        --resource-suffix)
            RESOURCE_SUFFIX="$2"
            shift 2
            ;;
        --what-if)
            WHAT_IF=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_color $RED "❌ Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$ENVIRONMENT" || -z "$SUBSCRIPTION_ID" || -z "$RESOURCE_GROUP_NAME" ]]; then
    print_color $RED "❌ Missing required parameters"
    show_usage
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    print_color $RED "❌ Invalid environment. Must be dev, staging, or prod"
    exit 1
fi

print_color $GREEN "🚀 Starting Azure infrastructure deployment for environment: $ENVIRONMENT"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_color $RED "❌ Azure CLI is not installed. Please install Azure CLI first."
    exit 1
fi
print_color $GREEN "✅ Azure CLI is installed"

# Check if Bicep CLI is installed
if ! az bicep version &> /dev/null; then
    print_color $YELLOW "⚠️  Bicep CLI not found. Installing..."
    az bicep install
fi
print_color $GREEN "✅ Bicep CLI is installed"

# Login to Azure if not already logged in
print_color $YELLOW "🔐 Checking Azure login status..."
if ! az account show &> /dev/null; then
    print_color $YELLOW "⚠️  Not logged in to Azure. Initiating login..."
    az login
else
    print_color $GREEN "✅ Already logged in to Azure"
fi

# Set subscription
print_color $YELLOW "📋 Setting Azure subscription to: $SUBSCRIPTION_ID"
az account set --subscription "$SUBSCRIPTION_ID"

# Check if resource group exists, create if not
print_color $YELLOW "🏗️  Checking if resource group exists: $RESOURCE_GROUP_NAME"
if ! az group exists --name "$RESOURCE_GROUP_NAME" --output tsv | grep -q "true"; then
    print_color $YELLOW "⚠️  Resource group does not exist. Creating..."
    az group create --name "$RESOURCE_GROUP_NAME" --location "$LOCATION"
    print_color $GREEN "✅ Resource group created"
else
    print_color $GREEN "✅ Resource group already exists"
fi

# Get current user's object ID if not provided
if [[ -z "$KEYVAULT_ACCESS_OBJECT_ID" ]]; then
    print_color $YELLOW "🔍 Getting current user's object ID for Key Vault access..."
    KEYVAULT_ACCESS_OBJECT_ID=$(az ad signed-in-user show --query objectId --output tsv)
    print_color $GREEN "✅ Using object ID: $KEYVAULT_ACCESS_OBJECT_ID"
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BICEP_FILE="$SCRIPT_DIR/../bicep/main.bicep"
PARAMETERS_FILE="$SCRIPT_DIR/../bicep/main.$ENVIRONMENT.bicepparam"

# Check if files exist
if [[ ! -f "$BICEP_FILE" ]]; then
    print_color $RED "❌ Bicep template file not found: $BICEP_FILE"
    exit 1
fi

if [[ ! -f "$PARAMETERS_FILE" ]]; then
    print_color $RED "❌ Parameters file not found: $PARAMETERS_FILE"
    exit 1
fi

# Build deployment command
DEPLOYMENT_NAME="meal-planner-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S)"

DEPLOY_CMD=(
    "az" "deployment" "group" "create"
    "--resource-group" "$RESOURCE_GROUP_NAME"
    "--name" "$DEPLOYMENT_NAME"
    "--template-file" "$BICEP_FILE"
    "--parameters" "$PARAMETERS_FILE"
    "--parameters" "keyVaultAccessObjectId=$KEYVAULT_ACCESS_OBJECT_ID"
)

# Add optional parameters
if [[ -n "$RESOURCE_SUFFIX" ]]; then
    DEPLOY_CMD+=("--parameters" "resourceSuffix=$RESOURCE_SUFFIX")
fi

# Add what-if flag if specified
if $WHAT_IF; then
    DEPLOY_CMD+=("--what-if")
    print_color $YELLOW "🔍 Running deployment validation (what-if mode)..."
else
    print_color $YELLOW "🚀 Starting deployment..."
fi

# Execute deployment
print_color $GREEN "💻 Executing deployment..."
"${DEPLOY_CMD[@]}"

if [[ $? -eq 0 ]]; then
    if $WHAT_IF; then
        print_color $GREEN "✅ What-if validation completed successfully"
    else
        print_color $GREEN "🎉 Deployment completed successfully!"
        
        # Get deployment outputs
        print_color $YELLOW "📋 Getting deployment outputs..."
        OUTPUTS=$(az deployment group show --resource-group "$RESOURCE_GROUP_NAME" --name "$DEPLOYMENT_NAME" --query properties.outputs --output json)
        
        print_color $GREEN "📊 Deployment Outputs:"
        print_color $WHITE "Static Web App URL: $(echo "$OUTPUTS" | jq -r '.staticWebAppUrl.value')"
        print_color $WHITE "Function App URL: $(echo "$OUTPUTS" | jq -r '.functionAppUrl.value')"
        print_color $WHITE "Cosmos DB Endpoint: $(echo "$OUTPUTS" | jq -r '.cosmosDbEndpoint.value')"
        print_color $WHITE "OpenAI Endpoint: $(echo "$OUTPUTS" | jq -r '.openAiEndpoint.value')"
        print_color $WHITE "Key Vault URI: $(echo "$OUTPUTS" | jq -r '.keyVaultUri.value')"
        print_color $WHITE "Resource Group: $(echo "$OUTPUTS" | jq -r '.resourceGroupName.value')"
    fi
else
    print_color $RED "❌ Deployment failed"
    exit 1
fi

print_color $GREEN "✨ Script completed successfully!"