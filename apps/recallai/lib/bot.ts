import type { Param } from "@w6w/types";
import { compact, jsonObject } from "./client.ts";

export const TRANSCRIPT_PROVIDERS = [
  { value: "none", label: "No transcript" },
  { value: "recallai_streaming", label: "Recall.ai transcription (streaming)" },
  { value: "meeting_captions", label: "Meeting platform captions" },
] as const;

/** Bot fields shared by Create Bot and Update Scheduled Bot. */
export const botConfigParams = (): Param[] => [
  {
    key: "botName",
    label: "Bot name",
    type: "string",
    hint: "The display name participants see. Defaults to Recall's own name when omitted.",
  },
  {
    key: "joinAt",
    label: "Join at",
    type: "datetime",
    hint:
      "ISO 8601. Omit to join immediately (an ad-hoc bot). Scheduling needs at least ~10 minutes of lead time, and a scheduled bot cannot be updated closer than that to its join time.",
  },
  {
    key: "transcriptProvider",
    label: "Transcript provider",
    type: "select",
    options: TRANSCRIPT_PROVIDERS.map((p) => ({ ...p })),
    hint:
      "Shortcut for `recording_config.transcript.provider`. Leave empty to send nothing and keep Recall's default. Other providers (AssemblyAI, Deepgram, ...) go in Recording config.",
  },
  {
    key: "transcriptLanguage",
    label: "Transcript language",
    type: "string",
    hint:
      "Language code for the shortcut provider: `auto` (default), `en`, `en_us`, `fr`, ... for Recall.ai transcription; `en`, `pt-BR`, ... for meeting captions.",
  },
  {
    key: "recordingConfig",
    label: "Recording config",
    type: "json",
    hint:
      'Recall `recording_config` object, e.g. {"video_mixed_mp4":{},"retention":{"type":"timed","hours":72}}. Keys here override the shortcut fields above.',
  },
  {
    key: "extra",
    label: "Other bot settings",
    type: "json",
    hint:
      "Further top-level bot fields merged as-is: automatic_leave, chat, output_media, automatic_audio_output, automatic_video_output, variant, zoom, google_meet, webex, breakout_room.",
  },
  {
    key: "metadata",
    label: "Metadata",
    type: "json",
    hint: 'Custom metadata object, e.g. {"deal_id":"123"}. Filterable on List Bots.',
  },
];

export interface BotConfigInput {
  botName?: string;
  joinAt?: string;
  transcriptProvider?: string;
  transcriptLanguage?: string;
  recordingConfig?: unknown;
  extra?: unknown;
  metadata?: unknown;
}

/** Build the `recording_config` from the transcript shortcut plus the caller's own object. */
export function recordingConfig(input: BotConfigInput): Record<string, unknown> | undefined {
  const base: Record<string, unknown> = {};
  const provider = input.transcriptProvider;
  if (provider === "recallai_streaming" || provider === "meeting_captions") {
    const language = input.transcriptLanguage?.trim();
    base.transcript = {
      provider: { [provider]: language ? { language_code: language } : {} },
    };
  }
  const own = jsonObject(input.recordingConfig);
  const merged = { ...base, ...(own ?? {}) };
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/** The request body shared by Create Bot and Update Scheduled Bot. */
export function botBody(input: BotConfigInput): Record<string, unknown> {
  return compact({
    ...(jsonObject(input.extra) ?? {}),
    bot_name: input.botName,
    join_at: input.joinAt,
    recording_config: recordingConfig(input),
    metadata: jsonObject(input.metadata),
  });
}
