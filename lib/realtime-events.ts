export type VoiceTransportEvent =
  | { type: "user-transcript"; text: string }
  | {
      type: "assistant-delta";
      itemId: string | null;
      responseId: string | null;
      text: string;
    }
  | {
      type: "assistant-done";
      itemId: string | null;
      responseId: string | null;
      text: string;
    }
  | { type: "user-speech-started" }
  | { type: "user-speech-stopped" }
  | { type: "assistant-audio-started"; responseId: string | null }
  | { type: "assistant-audio-stopped"; responseId: string | null }
  | { type: "transport-error" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(
  value: Record<string, unknown>,
  key: string,
): string | null {
  return typeof value[key] === "string" ? value[key] : null;
}

/**
 * Reduces Azure's GA Realtime protocol to the small event surface the UI needs.
 * Unknown and malformed events are intentionally ignored.
 */
export function parseRealtimeServerEvent(
  raw: string,
): VoiceTransportEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value) || typeof value.type !== "string") return null;

  switch (value.type) {
    case "conversation.item.input_audio_transcription.completed": {
      const text = optionalString(value, "transcript")?.trim();
      return text ? { type: "user-transcript", text } : null;
    }
    case "response.output_audio_transcript.delta":
    case "response.output_text.delta": {
      const text = optionalString(value, "delta");
      return text
        ? {
            type: "assistant-delta",
            itemId: optionalString(value, "item_id"),
            responseId: optionalString(value, "response_id"),
            text,
          }
        : null;
    }
    case "response.output_audio_transcript.done":
    case "response.output_text.done":
      return {
        type: "assistant-done",
        itemId: optionalString(value, "item_id"),
        responseId: optionalString(value, "response_id"),
        text: optionalString(value, "transcript") ??
          optionalString(value, "text") ??
          "",
      };
    case "input_audio_buffer.speech_started":
      return { type: "user-speech-started" };
    case "input_audio_buffer.speech_stopped":
      return { type: "user-speech-stopped" };
    case "output_audio_buffer.started":
      return {
        type: "assistant-audio-started",
        responseId: optionalString(value, "response_id"),
      };
    case "output_audio_buffer.stopped":
      return {
        type: "assistant-audio-stopped",
        responseId: optionalString(value, "response_id"),
      };
    case "conversation.item.input_audio_transcription.failed":
    case "error":
      return { type: "transport-error" };
    default:
      return null;
  }
}
