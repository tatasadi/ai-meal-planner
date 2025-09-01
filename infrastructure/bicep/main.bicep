// Main Bicep template for AI Meal Planner infrastructure
targetScope = 'resourceGroup'

@description('The name of the application')
param appName string = 'ai-meal-planner'

@description('The environment (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('The location for all resources')
param location string = resourceGroup().location

@description('The pricing tier for Cosmos DB')
@allowed(['Free', 'Standard'])
param cosmosDbTier string = 'Free'

@description('The SKU for Azure OpenAI')
@allowed(['S0'])
param openAiSku string = 'S0'

@description('The pricing tier for Key Vault')
@allowed(['standard', 'premium'])
param keyVaultSku string = 'standard'

@description('Object ID of the user/service principal that will have access to Key Vault')
param keyVaultAccessObjectId string

// GitHub integration removed - use custom GitHub Actions instead

@description('Unique suffix for resource names (4 characters max, lowercase letters/numbers only)')
@maxLength(4)
param resourceSuffix string = ''

// Variables
var actualSuffix = !empty(resourceSuffix) ? resourceSuffix : substring(uniqueString(resourceGroup().id), 0, 4)
var resourcePrefix = '${appName}-${environment}-${actualSuffix}'
var cleanAppName = replace(appName, '-', '')
var keyVaultName = substring('${cleanAppName}${environment}${actualSuffix}kv', 0, min(length('${cleanAppName}${environment}${actualSuffix}kv'), 24))
var tags = {
  application: appName
  environment: environment
  managedBy: 'bicep'
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${resourcePrefix}-insights'
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
    RetentionInDays: 90
    PublicNetworkAccessForIngestion: 'Enabled'
    PublicNetworkAccessForQuery: 'Enabled'
  }
}

// Log Analytics Workspace (required for Application Insights)
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2021-12-01-preview' = {
  name: '${resourcePrefix}-logs'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: keyVaultSku
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    purgeProtectionEnabled: false
    accessPolicies: []
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Role assignment for Key Vault access
resource keyVaultSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, keyVaultAccessObjectId, 'Key Vault Secrets User')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: keyVaultAccessObjectId
    principalType: 'User'
  }
}

// Cosmos DB Account
resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: '${resourcePrefix}-cosmos'
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    databaseAccountOfferType: 'Standard'
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    publicNetworkAccess: 'Enabled'
    capabilities: environment == 'dev' ? [
      {
        name: 'EnableServerless'
      }
    ] : []
  }
}

// Cosmos DB Database
resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  parent: cosmosDbAccount
  name: 'meal-planner'
  properties: {
    resource: {
      id: 'meal-planner'
    }
    options: environment == 'dev' ? {} : {
      throughput: 400
    }
  }
}

// Cosmos DB Containers
resource userProfilesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDb
  name: 'user-profiles'
  properties: {
    resource: {
      id: 'user-profiles'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
      indexingPolicy: {
        automatic: true
        indexingMode: 'consistent'
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
    }
    options: environment == 'dev' ? {} : {
      throughput: 400
    }
  }
}

resource mealPlansContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDb
  name: 'meal-plans'
  properties: {
    resource: {
      id: 'meal-plans'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
      indexingPolicy: {
        automatic: true
        indexingMode: 'consistent'
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
    }
    options: environment == 'dev' ? {} : {
      throughput: 400
    }
  }
}

resource chatMessagesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDb
  name: 'chat-messages'
  properties: {
    resource: {
      id: 'chat-messages'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
      indexingPolicy: {
        automatic: true
        indexingMode: 'consistent'
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
    }
    options: environment == 'dev' ? {} : {
      throughput: 400
    }
  }
}

// Azure OpenAI Service
resource openAiService 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = {
  name: '${resourcePrefix}-openai'
  location: location
  tags: tags
  kind: 'OpenAI'
  sku: {
    name: openAiSku
  }
  properties: {
    customSubDomainName: '${resourcePrefix}-openai'
    publicNetworkAccess: 'Enabled'
    restrictOutboundNetworkAccess: false
  }
}

// Azure OpenAI GPT-4o Deployment
resource gpt4oDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-10-01-preview' = {
  parent: openAiService
  name: 'gpt-4o'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o'
      version: '2024-08-06'
    }
    raiPolicyName: 'Microsoft.Default'
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
  }
  sku: {
    name: 'GlobalStandard'
    capacity: 30
  }
}

// Function App removed - using Static Web App APIs instead

// Static Web App with built-in API support
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: '${resourcePrefix}-web'
  location: 'Central US' // Static Web Apps have limited locations
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    // Deploy via custom GitHub Actions
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'  // Next.js API routes will be deployed as Static Web App APIs
      outputLocation: 'out'
    }
  }
}

// Store secrets in Key Vault
resource cosmosDbKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'cosmos-db-key'
  properties: {
    value: cosmosDbAccount.listKeys().primaryMasterKey
  }
}

resource openAiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'openai-api-key'
  properties: {
    value: openAiService.listKeys().key1
  }
}

resource appInsightsConnectionStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'app-insights-connection-string'
  properties: {
    value: appInsights.properties.ConnectionString
  }
}

// Outputs
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output staticWebAppApiUrl string = 'https://${staticWebApp.properties.defaultHostname}/api'
output staticWebAppDeploymentToken string = staticWebApp.listSecrets().properties.apiKey
output cosmosDbEndpoint string = cosmosDbAccount.properties.documentEndpoint
output openAiEndpoint string = openAiService.properties.endpoint
output keyVaultUri string = keyVault.properties.vaultUri
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output resourceGroupName string = resourceGroup().name
