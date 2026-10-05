import type { ActionDefinition } from "@w6w/types";
import { compact, PlaudClient, requireString } from "../lib/client.ts";

interface Created {
  transcription_id?: string;
  status?: string;
}

const action: ActionDefinition = {
  key: "transcription-submit",
  type: "perform",
  resource: "transcription",
  title: "Submit audio for transcription",
  description:
    "Start an asynchronous transcription of a publicly reachable audio file (M4A, MP3 or WAV) — either a URL you host or the download URL from Complete an audio upload. Poll with Get a transcription. Recordings over 5 hours should be split. Needs the connection's transcription API key, and Plaud documents the Transcription API as unlocked only after a device has been bound through the Embedded SDK.",
  idempotent: false,
  params: [
    {
      key: "fileUrl",
      label: "Audio URL",
      type: "string",
      required: true,
      hint: "A publicly accessible URL of the audio file.",
    },
    {
      key: "language",
      label: "Language",
      type: "string",
      default: "auto",
      hint: "BCP-47 code such as en-US or zh-CN, or auto.",
    },
    {
      key: "model",
      label: "Model",
      type: "string",
      hint:
        'Optional model name. Plaud\'s prose examples use "plaud-fast-whisper"; the OpenAPI schema does not list it, so it is only sent when set.',
    },
    {
      key: "detectionLevel",
      label: "Language detection level",
      type: "select",
      options: [{ value: "segment", label: "segment" }, { value: "chapter", label: "chapter" }],
    },
    { key: "diarization", label: "Identify speakers", type: "boolean", default: false },
    {
      key: "decodeSilence",
      label: "Decode silent regions",
      type: "boolean",
      default: false,
    },
    {
      key: "hotwords",
      label: "Hotwords",
      type: "string",
      hint: "Comma-separated custom vocabulary, e.g. plaud,gpt.",
    },
  ],
  output: [
    { key: "transcriptionId", type: "string", label: "Task id to poll" },
    { key: "status", type: "string", label: "Initial status, normally PENDING" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const fileUrl = requireString(p.fileUrl, "fileUrl");
    if (!/^https?:\/\//i.test(fileUrl)) throw new Error("`fileUrl` must be an http(s) URL");
    const transcribe = compact({
      language: p.language === undefined ? undefined : String(p.language).trim(),
      model: p.model === undefined ? undefined : String(p.model).trim(),
      detection_level: p.detectionLevel === undefined ? undefined : String(p.detectionLevel),
    });
    const params = compact({
      transcribe: Object.keys(transcribe).length ? transcribe : undefined,
      vad: typeof p.decodeSilence === "boolean" ? { decode_silence: p.decodeSilence } : undefined,
      diarization: typeof p.diarization === "boolean" ? { enabled: p.diarization } : undefined,
      hotwords: p.hotwords === undefined ? undefined : String(p.hotwords).trim(),
    });
    const res = await new PlaudClient(ctx).request<Created>(
      "/open/partner/ai/transcriptions/",
      {
        method: "POST",
        body: compact({
          file_url: fileUrl,
          params: Object.keys(params).length ? params : undefined,
        }),
      },
    );
    return { transcriptionId: res.transcription_id ?? null, status: res.status ?? null };
  },
};

export default action;
