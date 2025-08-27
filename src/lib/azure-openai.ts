import { createOpenAI } from "@ai-sdk/openai"

// Validate required environment variables
const requiredEnvVars = {
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2025-01-01-preview",
} as const

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key)

if (missingVars.length > 0) {
  throw new Error(
    `Missing required Azure OpenAI environment variables: ${missingVars.join(", ")}. ` +
    "Please check your .env.local file."
  )
}

// Create Azure OpenAI client with correct configuration for Azure
// The key is to NOT include the deployment name or chat/completions in the baseURL
export const azure = createOpenAI({
  baseURL: `${requiredEnvVars.endpoint.replace(/\/$/, '')}/openai/deployments/${requiredEnvVars.deploymentName}`,
  apiKey: requiredEnvVars.apiKey,
  defaultQuery: { 'api-version': requiredEnvVars.apiVersion },
})

// Export the model - for Azure, we don't use the deployment name as model ID, use empty string
export const model = azure('')

// Configuration constants
export const AZURE_CONFIG = {
  endpoint: requiredEnvVars.endpoint!,
  deploymentName: requiredEnvVars.deploymentName!,
  apiVersion: requiredEnvVars.apiVersion,
  maxTokens: 4000,
  temperature: 0.7,
} as const