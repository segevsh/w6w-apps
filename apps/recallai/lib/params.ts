import type { OutputField, Param } from "@w6w/types";

export const idParam = (label: string, hint?: string): Param => ({
  key: "id",
  label,
  type: "string",
  required: true,
  ...(hint ? { hint } : {}),
});

export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: "The `nextCursor` from the previous page.",
};

export const recordingIdFilter: Param = {
  key: "recordingId",
  label: "Recording ID",
  type: "string",
  hint: "Only items belonging to this recording.",
};

export const createdAfterParam: Param = {
  key: "createdAfter",
  label: "Created after",
  type: "datetime",
  hint: "ISO 8601.",
};

export const createdBeforeParam: Param = {
  key: "createdBefore",
  label: "Created before",
  type: "datetime",
  hint: "ISO 8601.",
};

export const CURSOR_OUTPUT: OutputField[] = [
  { key: "nextCursor", type: "string", label: "Cursor for the next page; absent on the last" },
];

export const BOT_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Bot ID" },
  { key: "meeting_url", type: "object", label: "Meeting (platform and meeting id)" },
  { key: "bot_name", type: "string", label: "Bot display name" },
  { key: "join_at", type: "string", label: "Scheduled join time" },
  { key: "status_changes", type: "array", label: "Status history (code, sub_code, created_at)" },
  { key: "recordings", type: "array", label: "Recordings with media shortcuts" },
  { key: "recording_config", type: "object", label: "Recording configuration" },
  { key: "metadata", type: "object", label: "Custom metadata" },
];

export const RECORDING_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Recording ID" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "started_at", type: "string", label: "Started at" },
  { key: "completed_at", type: "string", label: "Completed at" },
  { key: "status", type: "object", label: "Status (code, sub_code, updated_at)" },
  { key: "media_shortcuts", type: "object", label: "Transcript, video, audio and event artifacts" },
  { key: "metadata", type: "object", label: "Custom metadata" },
];

export const TRANSCRIPT_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Transcript ID" },
  { key: "recording", type: "object", label: "Owning recording (id)" },
  { key: "status", type: "object", label: "Status (code: processing, done, failed, deleted)" },
  { key: "data", type: "object", label: "download_url of the transcript JSON when done" },
  { key: "provider", type: "object", label: "Transcription provider and its options" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "metadata", type: "object", label: "Custom metadata" },
];

export const CALENDAR_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Calendar ID" },
  { key: "platform", type: "string", label: "google_calendar or microsoft_outlook" },
  { key: "status", type: "string", label: "connected, connecting or disconnected" },
  { key: "platform_email", type: "string", label: "Calendar account email" },
  { key: "oauth_client_id", type: "string", label: "OAuth client ID" },
  { key: "webhook_url", type: "string", label: "Webhook URL" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "metadata", type: "object", label: "Custom metadata" },
];

export const CALENDAR_EVENT_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Calendar event ID" },
  { key: "calendar_id", type: "string", label: "Calendar ID" },
  { key: "start_time", type: "string", label: "Start time" },
  { key: "end_time", type: "string", label: "End time" },
  { key: "meeting_url", type: "string", label: "Meeting URL" },
  { key: "meeting_platform", type: "string", label: "Meeting platform" },
  { key: "bots", type: "array", label: "Scheduled bots (bot_id, deduplication_key, start_time)" },
  { key: "is_deleted", type: "boolean", label: "Deleted" },
  { key: "raw", type: "object", label: "Raw event from the calendar provider" },
];

export const DELETED_OUTPUT: OutputField[] = [
  { key: "deleted", type: "boolean", label: "True when Recall accepted the delete" },
  { key: "id", type: "string", label: "ID that was deleted" },
];

export const PARTICIPANT_EVENTS_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Artifact ID" },
  { key: "recording", type: "object", label: "Owning recording (id)" },
  { key: "status", type: "object", label: "Status (code)" },
  {
    key: "data",
    type: "object",
    label:
      "participant_events_download_url, speaker_timeline_download_url, participants_download_url",
  },
  { key: "created_at", type: "string", label: "Created at" },
];

export const META_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Artifact ID" },
  { key: "recording", type: "object", label: "Owning recording (id)" },
  { key: "status", type: "object", label: "Status (code)" },
  { key: "data", type: "object", label: "Platform data, e.g. zoom.meeting_uuid" },
  { key: "created_at", type: "string", label: "Created at" },
];
