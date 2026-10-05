import type { Param } from "@w6w/types";
import { EXPAND_FIELDS, LIVE_EXPAND_FIELDS } from "./client.ts";

const options = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

export const expandParam = (
  values: readonly string[] = EXPAND_FIELDS,
  hint = "Extra fields to include. Expanding slows the response, especially on large lists.",
): Param => ({
  key: "expand",
  label: "Expand",
  type: "multiselect",
  options: options(values),
  hint,
});

export const liveExpandParam: Param = expandParam(
  LIVE_EXPAND_FIELDS,
  "Only transcript and chapter_summaries exist for a live meeting.",
);

export const meetingIdParam: Param = {
  key: "meetingId",
  label: "Meeting ID",
  type: "string",
  required: true,
  hint: "The meeting's ULID, e.g. 01HFYH0A6JM4R7MZ2E6X5T9BNP.",
};

const ms = (key: string, label: string, hint: string): Param => ({
  key,
  label,
  type: "number",
  hint,
  validation: { integer: true, min: 0 },
});

export const timeParams: Param[] = [
  ms("startTimeMsGt", "Started after (ms)", "Unix epoch milliseconds, exclusive."),
  ms("startTimeMsGte", "Started at or after (ms)", "Unix epoch milliseconds, inclusive."),
  ms("startTimeMsLt", "Started before (ms)", "Unix epoch milliseconds, exclusive."),
  ms("startTimeMsLte", "Started at or before (ms)", "Unix epoch milliseconds, inclusive."),
];

export const MEETING_OUTPUT_FIELDS = [
  { key: "id", type: "string", label: "Meeting ID (ULID)" },
  { key: "title", type: "string", label: "Title" },
  { key: "start_time_ms", type: "number", label: "Start time (epoch ms)" },
  { key: "end_time_ms", type: "number", label: "End time (epoch ms) — null while in progress" },
  { key: "participants", type: "array", label: "Participants (name, email, invited, attended)" },
  { key: "owner", type: "object", label: "Owner (name, email)" },
  { key: "report_url", type: "string", label: "Report URL" },
  { key: "platform", type: "string", label: "Meeting platform" },
  { key: "folders", type: "array", label: "Folders" },
  { key: "live_enabled", type: "boolean", label: "Whether live capture is enabled" },
] as const;
