# Azure Infrastructure Deployment

This directory contains the Azure Bicep templates and deployment scripts for the AI Meal Planner application infrastructure.

## Prerequisites

1. **Azure CLI** - [Install Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
2. **Bicep CLI** - Install via `az bicep install`
3. **Azure Subscription** - Active Azure subscription with appropriate permissions
4. **GitHub Repository** - (Optional) For Static Web App deployment

## Required Permissions

Your Azure account needs the following permissions:
- `Contributor` role on the subscription or resource group
- `User Access Administrator` role for Key Vault access assignments
- Permission to create service principals (if using automated deployments)

## Quick Start

### 1. Prepare Parameters

Edit the parameter files in `bicep/` directory:

- `main.dev.bicepparam` - Development environment
- `main.staging.bicepparam` - Staging environment  
- `main.prod.bicepparam` - Production environment

Required parameters to update:
```bicep
param keyVaultAccessObjectId = 'your-azure-ad-object-id'
param resourceSuffix = 'dev3' // Unique suffix for your resources
```

### 2. Deploy Infrastructure

#### Windows (PowerShell)
```powershell
# Deploy to development
.\infrastructure\scripts\deploy.ps1 `
  -Environment "dev" `
  -SubscriptionId "your-subscription-id" `
  -ResourceGroupName "rg-meal-planner-dev" `
  -KeyVaultAccessObjectId "your-object-id"

# With custom resource suffix
.\infrastructure\scripts\deploy.ps1 `
  -Environment "dev" `
  -SubscriptionId "your-subscription-id" `
  -ResourceGroupName "rg-meal-planner-dev" `
  -KeyVaultAccessObjectId "your-object-id" `
  -ResourceSuffix "test"
```

#### Linux/macOS (Bash)
```bash
# Make script executable (first time only)
chmod +x infrastructure/scripts/deploy.sh

# Deploy to development
./infrastructure/scripts/deploy.sh \
  --environment dev \
  --subscription-id "your-subscription-id" \
  --resource-group "rg-meal-planner-dev" \
  --keyvault-access-id "your-object-id"

# With custom resource suffix
./infrastructure/scripts/deploy.sh \
  --environment dev \
  --subscription-id "your-subscription-id" \
  --resource-group "rg-meal-planner-dev" \
  --keyvault-access-id "your-object-id" \
  --resource-suffix "test"
```

### 3. Validation (What-If)

Test your deployment without making changes:

```powershell
# PowerShell
.\infrastructure\scripts\deploy.ps1 -Environment "dev" -SubscriptionId "your-sub-id" -ResourceGroupName "rg-test" -KeyVaultAccessObjectId "your-object-id" -WhatIf

# Bash
./infrastructure/scripts/deploy.sh --environment dev --subscription-id "your-sub-id" --resource-group "rg-test" --keyvault-access-id "your-object-id" --what-if
```

## Architecture Overview

The Bicep template deploys the following Azure resources:

### Core Services
- **Azure Static Web Apps** - Hosts the Next.js frontend
- **Azure Functions** - Serverless API backend
- **Azure Cosmos DB** - NoSQL database for user data and meal plans
- **Azure OpenAI Service** - GPT-4o deployment for meal generation

### Supporting Services
- **Azure Key Vault** - Secure storage for secrets and connection strings
- **Azure Application Insights** - Application monitoring and telemetry
- **Azure Storage Account** - Required for Azure Functions
- **Log Analytics Workspace** - Logging and monitoring

### Security & Access
- **Managed Identity** - Secure service-to-service authentication
- **RBAC** - Role-based access control for Key Vault
- **CORS Configuration** - Properly configured cross-origin requests

## Environment Differences

| Resource | Development | Staging | Production |
|----------|-------------|---------|------------|
| Cosmos DB | Serverless (Free) | Standard (400 RU/s) | Standard (400 RU/s) |
| Key Vault | Standard | Standard | Premium |
| Functions | Consumption | Consumption | Consumption |
| Static Web Apps | Free | Free | Standard* |

*Production may require Standard tier for custom domains and advanced features.

## Resource Naming Convention

Resources are named using the pattern: `{appName}-{environment}-{resourceType}`

Examples:
- `ai-meal-planner-dev-web` (Static Web App)
- `ai-meal-planner-prod-func` (Function App)
- `ai-meal-planner-staging-cosmos` (Cosmos DB)

## Configuration After Deployment

### 1. Update Environment Variables

After deployment, update your local `.env.local` file with the output values:

```env
AZURE_OPENAI_ENDPOINT=https://ai-meal-planner-dev-openai.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
COSMOS_DB_ENDPOINT=https://ai-meal-planner-dev-cosmos.documents.azure.com:443/
COSMOS_DB_DATABASE_NAME=meal-planner
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...
```

### 2. Key Vault Secrets

The following secrets are automatically stored in Key Vault:
- `cosmos-db-key`
- `openai-api-key`
- `app-insights-connection-string`

### 3. Static Web App Configuration

The Static Web App is created without GitHub integration. To set up deployment:
1. Get the deployment token from the Azure portal or deployment outputs
2. Create custom GitHub Actions workflows for frontend and API deployment
3. Use the deployment token in your GitHub secrets as `AZURE_STATIC_WEB_APPS_API_TOKEN`

## Monitoring and Troubleshooting

### Application Insights
Access your Application Insights resource to monitor:
- API response times
- Error rates
- Custom telemetry
- User flows

### Cosmos DB Metrics
Monitor database performance:
- Request units consumption
- Query performance
- Storage usage

### Function App Logs
View Function App logs in:
- Azure portal > Function App > Monitor
- Application Insights > Live Metrics
- Log Analytics queries

## Cost Management

### Development Environment
- Cosmos DB: Free tier (limited RU/s)
- Functions: Consumption plan (pay-per-execution)
- Static Web Apps: Free tier
- Estimated monthly cost: $10-50

### Production Environment
- Cosmos DB: Provisioned throughput
- Functions: Consumption plan with higher usage
- OpenAI: Pay-per-token usage
- Estimated monthly cost: $100-500 (varies by usage)

## Cleanup

To delete all resources and avoid charges:

```powershell
# PowerShell
.\infrastructure\scripts\cleanup.ps1 -ResourceGroupName "rg-meal-planner-dev" -SubscriptionId "your-sub-id"

# Bash
# Create cleanup.sh script or use Azure CLI directly
az group delete --name "rg-meal-planner-dev" --yes
```

## GitHub Actions Setup

After infrastructure deployment:

1. **Get deployment token** from outputs:
   ```bash
   az staticwebapp secrets list --name "your-static-app-name" --resource-group "your-rg"
   ```

2. **Add to GitHub secrets**:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN`: Deployment token for Static Web App
   - `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`: Function App publish profile

3. **Create workflow files**:
   - `.github/workflows/deploy-frontend.yml`: Deploy Next.js to Static Web App
   - `.github/workflows/deploy-api.yml`: Deploy Function App APIs

## Security Best Practices

1. **Secrets Management**: Never commit secrets to version control
2. **Access Control**: Use least privilege principle for service accounts
3. **Network Security**: Configure IP restrictions for production
4. **Monitoring**: Enable security monitoring and alerts
5. **Updates**: Regularly update dependencies and Azure services

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure you have `Contributor` and `User Access Administrator` roles
2. **Quota Limits**: Check Azure subscription quotas for OpenAI and other services
3. **Region Availability**: Some services may not be available in all regions
4. **GitHub Integration**: Verify GitHub token has appropriate repository permissions

### Useful Commands

```bash
# Check deployment status
az deployment group show --resource-group "rg-name" --name "deployment-name"

# List all resources in resource group
az resource list --resource-group "rg-name" --output table

# Check Cosmos DB connection
az cosmosdb show --resource-group "rg-name" --name "cosmos-account-name"

# Test Function App
curl -X GET "https://your-function-app.azurewebsites.net/api/health"
```

## Support

For issues with:
- **Azure Resources**: Check Azure documentation or create Azure support ticket
- **Bicep Templates**: Review [Azure Bicep documentation](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- **Application Code**: Refer to the main project README

## Contributing

When making changes to the infrastructure:
1. Test changes in development environment first
2. Use `--what-if` flag to validate changes
3. Update this README if adding new resources or changing configuration
4. Consider cost implications of changes