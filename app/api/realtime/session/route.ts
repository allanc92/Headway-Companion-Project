import {
  buildRealtimeSessionConfig,
  getRealtimeConfig,
  isVoiceEnabled,
  realtimeCallsUrl,
  realtimeClientSecretsUrl,
} from "@/lib/realtime";

export const runtime = "nodejs";
export const maxDuration = 10;

function errorType(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

function responseHeaders(requestId: string): HeadersInit {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "x-request-id": requestId,
  };
}

function isClientSecretResponse(
  value: unknown,
): value is { value: string; expires_at: number } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.value === "string" &&
    record.value.length > 0 &&
    typeof record.expires_at === "number"
  );
}

export async function POST(req: Request): Promise<Response> {
  const requestId =
    req.headers.get("x-request-id")?.trim().slice(0, 128) ||
    crypto.randomUUID();
  const startedAt = Date.now();

  if (!isVoiceEnabled()) {
    console.info("[/api/realtime/session]", {
      event: "disabled",
      requestId,
      elapsedMs: Date.now() - startedAt,
    });
    return Response.json(
      { enabled: false },
      { status: 404, headers: responseHeaders(requestId) },
    );
  }

  const config = getRealtimeConfig();
  console.info("[/api/realtime/session]", {
    event: "request",
    requestId,
    mode: "azure-webrtc",
  });

  try {
    const upstream = await fetch(realtimeClientSecretsUrl(config), {
      method: "POST",
      headers: {
        "api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildRealtimeSessionConfig(config)),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!upstream.ok) {
      console.error("[/api/realtime/session]", {
        event: "provider-error",
        requestId,
        mode: "azure-webrtc",
        upstreamStatus: upstream.status,
        elapsedMs: Date.now() - startedAt,
      });
      return Response.json(
        { enabled: false },
        { status: 503, headers: responseHeaders(requestId) },
      );
    }

    const secret: unknown = await upstream.json();
    if (!isClientSecretResponse(secret)) {
      throw new TypeError("Invalid Azure Realtime client-secret response.");
    }

    console.info("[/api/realtime/session]", {
      event: "done",
      requestId,
      mode: "azure-webrtc",
      elapsedMs: Date.now() - startedAt,
    });

    return Response.json(
      {
        enabled: true,
        clientSecret: secret.value,
        expiresAt: secret.expires_at,
        model: config.deployment,
        voice: config.voice,
        webrtcUrl: realtimeCallsUrl(config),
      },
      { headers: responseHeaders(requestId) },
    );
  } catch (error) {
    console.error("[/api/realtime/session]", {
      event: "session-error",
      requestId,
      mode: "azure-webrtc",
      errorType: errorType(error),
      elapsedMs: Date.now() - startedAt,
    });
    return Response.json(
      { enabled: false },
      { status: 503, headers: responseHeaders(requestId) },
    );
  }
}
