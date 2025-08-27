import { createOpenAI } from "@ai-sdk/openai"

// Validate required environment variables
const requiredEnvVars = {
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-01",
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

// Create Azure OpenAI client
export const azure = createOpenAI({
  baseURL: `${requiredEnvVars.endpoint}openai/deployments/${requiredEnvVars.deploymentName}`,
  apiKey: requiredEnvVars.apiKey,
  apiVersion: requiredEnvVars.apiVersion,
})

// Export the model for use in API routes
export const model = azure(requiredEnvVars.deploymentName!)

// Configuration constants
export const AZURE_CONFIG = {
  endpoint: requiredEnvVars.endpoint!,
  deploymentName: requiredEnvVars.deploymentName!,
  apiVersion: requiredEnvVars.apiVersion,
  maxTokens: 4000,
  temperature: 0.7,
} as const