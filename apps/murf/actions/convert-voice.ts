import type { ActionDefinition } from "@w6w/types";
import { multipart, MurfClient } from "../lib/client.ts";

interface Input {
  voiceId: string;
  fileUrl: string;
  format?: string;
  sampleRate?: string;
  channelType?: string;
  locale?: string;
  style?: string;
  rate?: number;
  pitch?: number;
  variation?: number;
  retainAccent?: boolean;
  retainProsody?: boolean;
  returnTranscription?: boolean;
  encodeOutputAsBase64?: boolean;
}

const convertVoice: ActionDefinition<Input> = {
  key: "convert-voice",
  type: "perform",
  resource: "speech",
  title: "Convert Voice",
  description:
    "Re-voice an audio recording at a public URL with a Murf voice (POST /v1/voice-changer/convert, multipart with `file_url`). Uploading a file's bytes is not supported here, only a URL.",
  idempotent: false,
  params: [
    {
      key: "voiceId",
      label: "Voice ID",
      type: "string",
      required: true,
      placeholder: "en-US-natalie",
    },
    {
      key: "fileUrl",
      label: "Audio file URL",
      type: "string",
      required: true,
      hint: "A publicly reachable audio file.",
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      options: ["MP3", "WAV", "FLAC", "ALAW", "ULAW"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "sampleRate",
      label: "Sample rate",
      type: "select",
      options: ["8000", "24000", "44100", "48000"].map((v) => ({ value: v, label: `${v} Hz` })),
    },
    {
      key: "channelType",
      label: "Channels",
      type: "select",
      options: [{ value: "MONO", label: "Mono" }, { value: "STEREO", label: "Stereo" }],
    },
    { key: "locale", label: "Locale", type: "string", placeholder: "en-US" },
    { key: "style", label: "Style", type: "string" },
    {
      key: "rate",
      label: "Speed",
      type: "number",
      validation: { min: -50, max: 50, integer: true },
    },
    {
      key: "pitch",
      label: "Pitch",
      type: "number",
      validation: { min: -50, max: 50, integer: true },
    },
    {
      key: "variation",
      label: "Variation",
      type: "number",
      validation: { min: 0, max: 5, integer: true },
    },
    {
      key: "retainAccent",
      label: "Retain original accent",
      type: "boolean",
      hint: "Default true.",
    },
    {
      key: "retainProsody",
      label: "Retain original prosody",
      type: "boolean",
      hint: "Default true.",
    },
    { key: "returnTranscription", label: "Return transcription", type: "boolean" },
    { key: "encodeOutputAsBase64", label: "Also return Base64 audio", type: "boolean" },
  ],
  output: [
    { key: "audio_file", type: "string", label: "Audio file URL" },
    { key: "audio_length_in_seconds", type: "number", label: "Audio length (s)" },
    { key: "encoded_audio", type: "string", label: "Base64 audio (when requested)" },
    { key: "remaining_character_count", type: "number", label: "Characters left this cycle" },
    { key: "warning", type: "string", label: "Warning" },
  ],

  async execute(input, ctx) {
    if (!input.voiceId?.trim()) throw new Error("voiceId is required");
    if (!input.fileUrl?.trim()) throw new Error("fileUrl is required");
    const map: Array<[string, unknown]> = [
      ["voice_id", input.voiceId],
      ["file_url", input.fileUrl],
      ["format", input.format],
      ["sample_rate", input.sampleRate],
      ["channel_type", input.channelType],
      ["multi_native_locale", input.locale],
      ["style", input.style],
      ["rate", input.rate],
      ["pitch", input.pitch],
      ["variation", input.variation],
      ["retain_accent", input.retainAccent],
      ["retain_prosody", input.retainProsody],
      ["return_transcription", input.returnTranscription],
      ["encode_output_as_base64", input.encodeOutputAsBase64],
    ];
    const fields = map
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]): [string, string] => [k, String(v)]);
    return await new MurfClient(ctx).call("/v1/voice-changer/convert", {
      method: "POST",
      form: multipart(fields),
    });
  },
};

export default convertVoice;
