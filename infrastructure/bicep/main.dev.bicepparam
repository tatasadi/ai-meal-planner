// Parameters file for development environment
using './main.bicep'

param appName = 'ai-meal-planner'
param environment = 'dev'
param location = 'East US 2'
param cosmosDbTier = 'Free'
param openAiSku = 'S0'
param keyVaultSku = 'standard'
param keyVaultAccessObjectId = '' // Replace with your Azure AD Object ID
param resourceSuffix = 'dev3' // Consistent suffix for resource names
