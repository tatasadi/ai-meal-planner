import { createAzure } from "@ai-sdk/azure"

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

// Create Azure OpenAI client using the dedicated Azure provider
// Extract resource name from endpoint URL
const resourceName = requiredEnvVars
  .endpoint!.replace("https://", "")
  .replace(".openai.azure.com/", "")
  .replace(".openai.azure.com", "")

export const azure = createAzure({
  resourceName,
  apiKey: requiredEnvVars.apiKey!,
  apiVersion: requiredEnvVars.apiVersion,
  useDeploymentBasedUrls: true,
})

// Export the model using the deployment name
export const model = azure(requiredEnvVars.deploymentName!)

// Configuration constants
export const AZURE_CONFIG = {
  endpoint: requiredEnvVars.endpoint!,
  deploymentName: requiredEnvVars.deploymentName!,
  apiVersion: requiredEnvVars.apiVersion,
  maxTokens: 4000,
  temperature: 0.7,
} as const
