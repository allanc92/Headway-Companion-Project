import "server-only";

import { SUMMARY_READINESS_PROMPT } from "@/lib/copy";
import { COMPANION_SYSTEM } from "@/lib/prompts";
import { MIRROR_READY_MARKER } from "@/lib/types";

const DEFAULT_VOICE = "marin";

export interface RealtimeConfig {
  apiKey: string;
  deployment: string;
  endpoint: string;
  transcriptionDeployment: string;
  voice: string;
}

function configuredEndpoint(env: NodeJS.ProcessEnv): string | null {
  const resourceName = env.AZURE_RESOURCE_NAME?.trim();
  const raw =
    env.AZURE_REALTIME_ENDPOINT?.trim() ||
    env.AZURE_BASE_URL?.trim() ||
    (resourceName
      ? `https://${resourceName}.openai.azure.com`
      : "");

  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;

    const openAiPath = url.pathname.indexOf("/openai");
    const basePath =
      openAiPath >= 0 ? url.pathname.slice(0, openAiPath) : url.pathname;
    return `${url.origin}${basePath.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

export function resolveRealtimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): RealtimeConfig | null {
  const apiKey = env.AZURE_API_KEY?.trim();
  const deployment = env.AZURE_REALTIME_DEPLOYMENT?.trim();
  const transcriptionDeployment =
    env.AZURE_REALTIME_TRANSCRIPTION_DEPLOYMENT?.trim();
  const endpoint = configuredEndpoint(env);

  if (!apiKey || !deployment || !transcriptionDeployment || !endpoint) {
    return null;
  }

  return {
    apiKey,
    deployment,
    endpoint,
    transcriptionDeployment,
    voice: env.AZURE_REALTIME_VOICE?.trim() || DEFAULT_VOICE,
  };
}

export function hasRealtimeCreds(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return resolveRealtimeConfig(env) !== null;
}

export function isVoiceEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.VOICE_ENABLED === "true" && hasRealtimeCreds(env);
}

export function getRealtimeConfig(): RealtimeConfig {
  const config = resolveRealtimeConfig();
  if (!config) {
    throw new Error("Azure Realtime is not configured.");
  }
  return config;
}

export function realtimeClientSecretsUrl(config: RealtimeConfig): string {
  return `${config.endpoint}/openai/v1/realtime/client_secrets`;
}

export function realtimeCallsUrl(config: RealtimeConfig): string {
  return `${config.endpoint}/openai/v1/realtime/calls?webrtcfilter=on`;
}

export function buildRealtimeSessionConfig(config: RealtimeConfig) {
  const voiceInstructions = `VOICE SESSION DELIVERY
This is a continuous spoken conversation. Respond naturally for speech, leave room for pauses, and never describe controls or technical behavior.
The visible transcript comes from exactly what you say. For this voice session only, do not speak, spell, or output the hidden token ${MIRROR_READY_MARKER}; this instruction supersedes the token-output instruction above. When the person is ready, say exactly this consent check and nothing else: ${SUMMARY_READINESS_PROMPT}`;

  return {
    session: {
      type: "realtime",
      model: config.deployment,
      instructions: `${COMPANION_SYSTEM}\n\n${voiceInstructions}`,
      output_modalities: ["audio"],
      audio: {
        input: {
          transcription: {
            model: config.transcriptionDeployment,
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 650,
            create_response: true,
            interrupt_response: true,
          },
        },
        output: {
          voice: config.voice,
        },
      },
    },
  };
}
