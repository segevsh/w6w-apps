import type { ActionDefinition } from "@w6w/types";
import { PlaudClient, requireString } from "../lib/client.ts";

interface Segment {
  start?: number;
  end?: number;
  text?: string;
  speaker_id?: string;
  speaker?: string;
  language?: string;
}

interface Result {
  transcription_id?: string;
  status?: string;
  data?: {
    text?: string;
    language?: string;
    duration?: number;
    results?: Segment[];
    segments?: Segment[];
  };
}

const IN_PROGRESS = ["PENDING", "RECEIVED", "STARTED", "PROGRESS"];
const FAILED = ["FAILURE", "REVOKED"];

const action: ActionDefinition = {
  key: "transcription-get",
  type: "read",
  resource: "transcription",
  title: "Get a transcription",
  description:
    "Read a transcription task's status and, once it is SUCCESS, the transcript text, language, duration and time-aligned segments. PENDING, RECEIVED, STARTED and PROGRESS mean keep polling; FAILURE and REVOKED are terminal. Results are retained for 7 days by default.",
  params: [{ key: "transcriptionId", label: "Transcription id", type: "string", required: true }],
  output: [
    { key: "transcriptionId", type: "string", label: "Task id" },
    {
      key: "status",
      type: "string",
      label: "PENDING, RECEIVED, STARTED, PROGRESS, SUCCESS, FAILURE or REVOKED",
    },
    { key: "done", type: "boolean", label: "true once SUCCESS" },
    { key: "failed", type: "boolean", label: "true on FAILURE or REVOKED" },
    { key: "inProgress", type: "boolean", label: "true while still processing" },
    { key: "text", type: "string", label: "Full transcript" },
    { key: "language", type: "string", label: "Detected or given language" },
    { key: "duration", type: "number", label: "Audio duration in seconds" },
    { key: "segments", type: "array", label: "[{start, end, text, speaker, language}]" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireString(p.transcriptionId, "transcriptionId");
    const res = await new PlaudClient(ctx).request<Result>(
      `/open/partner/ai/transcriptions/${encodeURIComponent(id)}`,
    );
    const status = res.status ?? null;
    const data = res.data ?? {};
    // The OpenAPI schema names the segment array `results`; the prose example names it
    // `segments` with `speaker`. Accept both.
    const raw = data.results ?? data.segments ?? [];
    return {
      transcriptionId: res.transcription_id ?? id,
      status,
      done: status === "SUCCESS",
      failed: status !== null && FAILED.includes(status),
      inProgress: status !== null && IN_PROGRESS.includes(status),
      text: data.text ?? null,
      language: data.language ?? null,
      duration: data.duration ?? null,
      segments: raw.map((s) => ({
        start: s.start ?? null,
        end: s.end ?? null,
        text: s.text ?? null,
        speaker: s.speaker_id ?? s.speaker ?? null,
        language: s.language ?? null,
      })),
    };
  },
};

export default action;
