// Parameters file for staging environment
using './main.bicep'

param appName = 'ai-meal-planner'
param environment = 'staging'
param location = 'East US'
param cosmosDbTier = 'Standard'
param openAiSku = 'S0'
param keyVaultSku = 'standard'
param keyVaultAccessObjectId = '' // Replace with your Azure AD Object ID
param resourceSuffix = 'stg1' // Consistent suffix for resource names
