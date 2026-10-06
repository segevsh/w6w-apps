import type { OutputField, Param } from "@w6w/types";

/** Field names, defaults and enums are transcribed from Gladia's OpenAPI document (2026-10-06). */

export const transcriptionIdParam: Param = {
  key: "transcriptionId",
  label: "Job ID",
  type: "string",
  required: true,
  placeholder: "45463597-20b7-4af7-b3b3-f5fb778203ab",
  hint: "The `id` returned by Start Transcription or List Transcriptions.",
};

export const statusOptions = [
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "done", label: "Done" },
  { value: "error", label: "Error" },
];

export const modelOptions = [
  { value: "solaria-1", label: "Solaria 1 (default) — 100+ languages, code switching" },
  { value: "solaria-3", label: "Solaria 3 — EN/FR/DE/ES/IT, one language only" },
  { value: "solaria-fusion", label: "Solaria Fusion" },
];

export const piiPresets = [
  "GDPR",
  "GDPR_SENSITIVE",
  "HIPAA_SAFE_HARBOR",
  "HEALTH_INFORMATION",
  "PCI",
  "CCI",
  "CPRA",
  "APPI",
  "APPI_SENSITIVE",
  "QUEBEC_PRIVACY_ACT",
  "CORE_ENTITIES",
  "NUMERICAL_EXCL_PCI",
  "LIDI",
].map((v) => ({ value: v, label: v }));

/** The job object returned by Get / List items. */
export const jobOutputFields: OutputField[] = [
  { key: "id", type: "string", label: "Job ID" },
  { key: "request_id", type: "string", label: "Request ID (support reference)" },
  { key: "kind", type: "string", label: "Kind" },
  { key: "status", type: "string", label: "Status (queued, processing, done, error)" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "completed_at", type: "string", label: "Completed at" },
  { key: "error_code", type: "number", label: "Error code (when status is error)" },
  { key: "custom_metadata", type: "object", label: "Custom metadata" },
  { key: "file", type: "object", label: "File (filename, duration, channels)" },
  { key: "request_params", type: "object", label: "Request parameters" },
  { key: "result", type: "object", label: "Result (transcription, translation, summarization…)" },
  {
    key: "result.transcription.full_transcript",
    type: "string",
    label: "Full transcript text",
  },
  { key: "result.transcription.utterances", type: "array", label: "Utterances" },
];
