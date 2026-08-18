import type { ActionDefinition } from "@w6w/types";
import { csv, DeepgramClient, query } from "../lib/client.ts";

/**
 * `POST /v1/speak` — turn text into speech, delivered to a callback.
 *
 * ## The callback is required here, and that is a deliberate restriction
 *
 * Deepgram's synchronous `/v1/speak` streams **audio bytes** back in the
 * response body. A workflow step cannot usefully hold an MP3 in a variable: it
 * would have to be base64-encoded into the run's state, carried through every
 * subsequent step, and stored somewhere that was never designed for binary.
 *
 * With a `callback`, Deepgram answers immediately with a `request_id` and POSTs
 * the finished audio to a URL of your choosing — a storage endpoint, a webhook
 * that saves it, a media service that ingests it. That is the only shape in
 * which text-to-speech is a sensible workflow step, so this action requires it
 * rather than offering a mode that half works.
 *
 * ## The output format has to match what receives it
 *
 * `encoding`, `container`, `sampleRate` and `bitRate` are interdependent — a
 * telephony system wants `mulaw` at 8000 Hz and a podcast wants `mp3`. Getting
 * them wrong produces audio that plays as noise rather than an error, so the
 * defaults here are the general-purpose ones and the parameters say what they
 * are for.
 */
const action: ActionDefinition = {
  key: "speech-generate",
  type: "perform",
  resource: "speech",
  title: "Generate speech from text",
  description:
    "Text to speech, delivered to a callback URL. That is required rather than optional — the " +
    "synchronous form returns audio bytes, which a workflow step cannot usefully hold.",
  idempotent: false,
  params: [
    { key: "text", label: "Text", type: "text", required: true, default: "" },
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      required: true,
      default: "",
      hint: "Where Deepgram POSTs the finished audio. Required — see the description.",
    },
    {
      key: "model",
      label: "Voice",
      type: "string",
      default: "aura-2-thalia-en",
      hint: "Deepgram's voices are models, e.g. `aura-2-thalia-en`. `model-list` has the rest.",
    },
    {
      key: "encoding",
      label: "Encoding",
      type: "select",
      default: "mp3",
      options: [
        { value: "mp3", label: "MP3 — general purpose" },
        { value: "linear16", label: "linear16 — uncompressed WAV" },
        { value: "opus", label: "Opus" },
        { value: "flac", label: "FLAC" },
        { value: "mulaw", label: "mulaw — telephony" },
        { value: "alaw", label: "alaw — telephony" },
      ],
      hint: "Must match what receives it: telephony wants mulaw at 8000 Hz, a podcast wants mp3. " +
        "A mismatch plays as noise rather than failing.",
    },
    {
      key: "sampleRate",
      label: "Sample Rate",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Hz. Blank uses the encoding's default; telephony is 8000.",
    },
    { key: "bitRate", label: "Bit Rate", type: "number", default: 0, advanced: true },
    { key: "container", label: "Container", type: "string", default: "", advanced: true },
    {
      key: "speed",
      label: "Speed",
      type: "number",
      default: 0,
      advanced: true,
      hint: "A multiplier on the speaking rate; blank leaves it natural.",
    },
    {
      key: "mipOptOut",
      label: "Opt Out of Model Improvement",
      type: "boolean",
      default: false,
      hint: "Left off, submitted text may be used to improve Deepgram's models. Has a pricing " +
        "impact.",
    },
    { key: "tag", label: "Tags", type: "string", default: "", advanced: true },
  ],
  output: [
    { key: "request_id", type: "string", label: "Request id — the audio follows to the callback" },
    { key: "pending", type: "boolean", label: "Always true; nothing is returned inline" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const text = String(p.text ?? "").trim();
    if (!text) throw new Error("`text` is required");
    const callbackUrl = String(p.callbackUrl ?? "").trim();
    if (!callbackUrl) {
      throw new Error(
        "`callbackUrl` is required — without one Deepgram streams raw audio bytes back, and a " +
          "workflow step has nowhere sensible to put them",
      );
    }

    const positive = (v: unknown) => {
      const n = Number(v ?? 0);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };

    const body = await new DeepgramClient(ctx).request<{
      request_id?: string;
      metadata?: { request_id?: string };
    }>("/v1/speak", {
      method: "POST",
      body: { text },
      query: query({
        callback: callbackUrl,
        model: p.model === undefined ? "aura-2-thalia-en" : String(p.model),
        encoding: p.encoding === undefined ? "mp3" : String(p.encoding),
        sample_rate: positive(p.sampleRate),
        bit_rate: positive(p.bitRate),
        container: p.container,
        speed: positive(p.speed),
        mip_opt_out: p.mipOptOut === true ? true : undefined,
        tag: csv(p.tag),
      }),
    });

    const requestId = body?.request_id ?? body?.metadata?.request_id;
    // The id; never the text, which is somebody's content.
    ctx.log("info", "queued Deepgram speech generation", { requestId });
    return { request_id: requestId, pending: true };
  },
};

export default action;
