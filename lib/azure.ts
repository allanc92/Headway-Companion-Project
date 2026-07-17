import { createAzure } from "@ai-sdk/azure";
import type { LanguageModel } from "ai";

/*
  Azure OpenAI wiring.

  Env (set in .env.local locally and in Vercel's encrypted env — never committed):
    AZURE_RESOURCE_NAME   e.g. "my-aoai"  (or set AZURE_BASE_URL instead)
    AZURE_API_KEY         the resource key
    AZURE_DEPLOYMENT_NAME the deployment name you created (e.g. "gpt-4o")
    AZURE_API_VERSION     e.g. "2024-10-21"  (optional)
    AZURE_USE_V1_API      set to "true" to use the new /openai/v1 API instead of
                          classic deployment-based URLs (optional)
*/

const resourceName = process.env.AZURE_RESOURCE_NAME;
const baseURL = process.env.AZURE_BASE_URL;
const apiKey = process.env.AZURE_API_KEY;
const apiVersion = process.env.AZURE_API_VERSION;
const deployment = process.env.AZURE_DEPLOYMENT_NAME;

export function hasAzureCreds(): boolean {
  return Boolean(apiKey && deployment && (resourceName || baseURL));
}

let cached: LanguageModel | null = null;

export function getModel(): LanguageModel {
  if (!hasAzureCreds()) {
    throw new Error("Azure OpenAI credentials are not configured.");
  }
  if (cached) return cached;

  const azure = createAzure({
    apiKey,
    ...(baseURL ? { baseURL } : { resourceName }),
    ...(apiVersion ? { apiVersion } : {}),
    // Default to classic deployment-based URLs, which most existing Azure OpenAI
    // resources use. Set AZURE_USE_V1_API=true to opt into the newer v1 API.
    useDeploymentBasedUrls: process.env.AZURE_USE_V1_API === "true" ? false : true,
  });

  cached = azure(deployment as string);
  return cached;
}
