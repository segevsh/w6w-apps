import type { ActionDefinition } from "@w6w/types";
import { compact, EdenClient } from "../lib/client.ts";

/**
 * `POST /v3/audio/speech` - OpenAI-compatible text-to-speech.
 *
 * The response is raw audio bytes (the format follows `response_format`), with the cost and
 * serving provider in `x-edenai-cost` / `x-edenai-provider` response headers. A step output cannot
 * carry binary, so the audio is returned base64-encoded.
 */
interface Input {
  model: string;
  input: string;
  voice?: string;
  responseFormat?: string;
  speed?: number;
  instructions?: string;
}

/** Base64 of a byte buffer, in chunks so a long clip does not overflow the call stack. */
export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

const speechCreate: ActionDefinition<Input> = {
  key: "speech-create",
  type: "perform",
  resource: "audio",
  title: "Text to Speech",
  description: "Synthesize spoken audio from text. The audio is returned base64-encoded.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "openai/tts-1",
      hint: "provider/model. The current ids are listed at GET /v3/audio/speech/models.",
    },
    { key: "input", label: "Text", type: "text", required: true },
    {
      key: "voice",
      label: "Voice",
      type: "string",
      hint: "A voice id or name valid for the model, e.g. alloy for openai/tts-1.",
    },
    {
      key: "responseFormat",
      label: "Audio format",
      type: "select",
      default: "mp3",
      options: ["mp3", "opus", "aac", "flac", "wav", "pcm"].map((v) => ({ value: v, label: v })),
    },
    { key: "speed", label: "Speed", type: "number", hint: "OpenAI and Azure accept 0.25 to 4.0." },
    { key: "instructions", label: "Delivery instructions", type: "text" },
  ],
  output: [
    { key: "audioBase64", type: "string", label: "Audio, base64-encoded" },
    { key: "contentType", type: "string", label: "Audio content type" },
    { key: "bytes", type: "number", label: "Audio size in bytes" },
    { key: "cost", type: "number", label: "Cost (USD)" },
    { key: "provider", type: "string", label: "Provider" },
  ],

  async execute(input, ctx) {
    const res = await new EdenClient(ctx).raw("/audio/speech", {
      method: "POST",
      body: compact({
        model: input.model,
        input: input.input,
        voice: input.voice,
        response_format: input.responseFormat,
        speed: input.speed,
        instructions: input.instructions,
      }),
    });
    const bytes = new Uint8Array(await res.arrayBuffer());
    const cost = res.headers.get("x-edenai-cost");
    return {
      audioBase64: toBase64(bytes),
      contentType: res.headers.get("content-type") ?? undefined,
      bytes: bytes.length,
      cost: cost === null || cost === "" || Number.isNaN(Number(cost)) ? undefined : Number(cost),
      provider: res.headers.get("x-edenai-provider") ?? undefined,
    };
  },
};

export default speechCreate;
