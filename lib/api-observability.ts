const REQUEST_ID_MAX_LENGTH = 128;

type ApiLogLevel = "info" | "warn" | "error";

interface ApiLogEntry {
  activity: string;
  event: string;
  requestId: string;
  [key: string]: unknown;
}

export function getRequestId(request: Request): string {
  const supplied = request.headers
    .get("x-request-id")
    ?.trim()
    .slice(0, REQUEST_ID_MAX_LENGTH);
  return supplied || crypto.randomUUID();
}

export function errorType(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

export function withRequestId(
  requestId: string,
  headers?: HeadersInit,
): Headers {
  const next = new Headers(headers);
  next.set("x-request-id", requestId);
  return next;
}

export function jsonWithRequestId(
  data: unknown,
  requestId: string,
  init: ResponseInit = {},
): Response {
  return Response.json(data, {
    ...init,
    headers: withRequestId(requestId, init.headers),
  });
}

export function logApiEvent(
  route: string,
  level: ApiLogLevel,
  entry: ApiLogEntry,
): void {
  const message = `[${route}] ${JSON.stringify(entry)}`;
  if (level === "error") {
    console.error(message);
  } else if (level === "warn") {
    console.warn(message);
  } else {
    console.info(message);
  }
}
