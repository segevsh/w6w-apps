import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";
import { seg } from "../lib/params.ts";

/**
 * `GET /v1/meeting_segments/?uuid=` — where each topic occurs in a meeting.
 * Note the query parameter is `uuid`, not `meeting_uuid` as on every sibling endpoint.
 */
interface Input {
  meetingUuid: string;
}

const meetingSegmentList: ActionDefinition<Input> = {
  key: "meeting-segment-list",
  type: "read",
  resource: "meeting",
  title: "Get Meeting Segments",
  description: "Time ranges (seconds) of the agenda, intro, demo, pricing, objection, pain " +
    "point and next-steps segments of a meeting.",
  params: [{ key: "meetingUuid", label: "Meeting UUID", type: "string", required: true }],
  output: [
    { key: "agenda", type: "array", label: "Agenda ranges" },
    { key: "intro", type: "array", label: "Intro ranges" },
    { key: "overview", type: "array", label: "Overview ranges" },
    { key: "demo", type: "array", label: "Demo ranges" },
    { key: "pricing", type: "array", label: "Pricing ranges" },
    { key: "objection", type: "array", label: "Objection ranges" },
    { key: "pain_point", type: "array", label: "Pain point ranges" },
    { key: "next_steps", type: "array", label: "Next steps ranges" },
    { key: "meeting", type: "array", label: "Whole-meeting ranges" },
  ],

  execute(input, ctx) {
    seg(input.meetingUuid, "meetingUuid");
    return new AvomaClient(ctx).get("/v1/meeting_segments/", { uuid: input.meetingUuid.trim() });
  },
};

export default meetingSegmentList;
