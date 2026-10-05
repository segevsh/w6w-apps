import type { ActionDefinition } from "@w6w/types";
import { EXPAND_FIELDS, pickExpand, ReadAiClient } from "../lib/client.ts";
import { expandParam, MEETING_OUTPUT_FIELDS, meetingIdParam } from "../lib/params.ts";

interface Input {
  meetingId: string;
  expand?: string[];
}

/**
 * `GET /v1/meetings/{id}`. For an in-progress, live-enabled meeting the vendor
 * says to use `/live` instead (see `get-live-meeting`).
 */
const getMeeting: ActionDefinition<Input> = {
  key: "get-meeting",
  type: "read",
  resource: "meeting",
  title: "Get Meeting",
  description:
    "Fetch one Read AI meeting by ID, optionally with its summary, chapter summaries, action " +
    "items, key questions, topics, transcript, metrics or recording download.",
  params: [meetingIdParam, expandParam()],
  output: [
    ...MEETING_OUTPUT_FIELDS,
    { key: "summary", type: "string", label: "Summary (when expanded)" },
    { key: "chapter_summaries", type: "array", label: "Chapter summaries (when expanded)" },
    { key: "action_items", type: "array", label: "Action items (when expanded)" },
    { key: "key_questions", type: "array", label: "Key questions (when expanded)" },
    { key: "topics", type: "array", label: "Topics (when expanded)" },
    { key: "transcript", type: "object", label: "Transcript (when expanded)" },
    { key: "metrics", type: "object", label: "Metrics (when expanded)" },
    { key: "recording_download", type: "object", label: "Recording download (when expanded)" },
  ],

  async execute(input, ctx) {
    const id = String(input.meetingId ?? "").trim();
    if (!id) throw new Error("meetingId is required");
    return await new ReadAiClient(ctx).get(`/v1/meetings/${encodeURIComponent(id)}`, {
      expand: pickExpand(input.expand, EXPAND_FIELDS),
    });
  },
};

export default getMeeting;
