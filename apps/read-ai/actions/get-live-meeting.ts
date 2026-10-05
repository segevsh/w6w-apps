import type { ActionDefinition } from "@w6w/types";
import { LIVE_EXPAND_FIELDS, pickExpand, ReadAiClient, timeFilters } from "../lib/client.ts";
import { liveExpandParam, MEETING_OUTPUT_FIELDS, meetingIdParam } from "../lib/params.ts";

interface Input {
  meetingId: string;
  startTimeMsGt?: number;
  startTimeMsGte?: number;
  expand?: string[];
}

/**
 * `GET /v1/meetings/{id}/live`. Live data exists only when someone had the live
 * dashboard open during the meeting; otherwise the vendor has nothing to return.
 * Only `start_time_ms.gt`/`.gte` are documented here (no `lt`/`lte`).
 */
const getLiveMeeting: ActionDefinition<Input> = {
  key: "get-live-meeting",
  type: "read",
  resource: "meeting",
  title: "Get Live Meeting",
  description:
    "Fetch a meeting in progress with its live transcript and chapter summaries. Available only " +
    "when the live dashboard was open during the meeting.",
  params: [
    meetingIdParam,
    {
      key: "startTimeMsGt",
      label: "After (ms)",
      type: "number",
      hint: "Only live data starting after this epoch-ms value — poll with the last turn's time.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "startTimeMsGte",
      label: "At or after (ms)",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    liveExpandParam,
  ],
  output: [
    ...MEETING_OUTPUT_FIELDS,
    { key: "transcript", type: "object", label: "Live transcript (speakers, turns, text)" },
    { key: "chapter_summaries", type: "array", label: "Chapter summaries" },
  ],

  async execute(input, ctx) {
    const id = String(input.meetingId ?? "").trim();
    if (!id) throw new Error("meetingId is required");
    return await new ReadAiClient(ctx).get(`/v1/meetings/${encodeURIComponent(id)}/live`, {
      ...timeFilters(input, ["startTimeMsGt", "startTimeMsGte"]),
      expand: pickExpand(input.expand, LIVE_EXPAND_FIELDS),
    });
  },
};

export default getLiveMeeting;
