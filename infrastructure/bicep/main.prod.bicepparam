// Parameters file for production environment
using './main.bicep'

param appName = 'ai-meal-planner'
param environment = 'prod'
param location = 'East US'
param cosmosDbTier = 'Standard'
param openAiSku = 'S0'
param keyVaultSku = 'premium'
param keyVaultAccessObjectId = '' // Replace with your Azure AD Object ID
param resourceSuffix = 'prd1' // Consistent suffix for resource names
