import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";
import { seg } from "../lib/params.ts";

/**
 * `GET /v1/meetings/{meeting_uuid}/insights/` — AI notes, keywords and speakers.
 * The meeting's `state` must be `completed`, or Avoma answers 404.
 */
interface Input {
  meetingUuid: string;
}

const meetingInsightsGet: ActionDefinition<Input> = {
  key: "meeting-insights-get",
  type: "read",
  resource: "meeting",
  title: "Get Meeting Insights",
  description: "AI-generated notes, keyword occurrences and speakers for a completed meeting.",
  params: [{
    key: "meetingUuid",
    label: "Meeting UUID",
    type: "string",
    required: true,
    hint: "The meeting must be in the `completed` state.",
  }],
  output: [
    { key: "ai_notes", type: "array", label: "AI notes" },
    { key: "keywords", type: "object", label: "Keywords (occurrences, popular)" },
    { key: "speakers", type: "array", label: "Speakers" },
  ],

  execute(input, ctx) {
    return new AvomaClient(ctx).get(
      `/v1/meetings/${seg(input.meetingUuid, "meetingUuid")}/insights/`,
    );
  },
};

export default meetingInsightsGet;
