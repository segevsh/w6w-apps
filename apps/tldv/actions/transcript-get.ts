import type { ActionDefinition } from "@w6w/types";
import { TldvClient } from "../lib/client.ts";
import { meetingIdParam } from "../lib/params.ts";

/**
 * `GET /v1alpha1/meetings/{meetingId}/transcript` — the meeting transcript,
 * speaker by speaker, sentence by sentence.
 *
 * The vendor's own description: "The transcript is returned only if it is
 * complete." A meeting still processing answers whatever tl;dv sends for that
 * case — undocumented in the OpenAPI schema, so this action does not guess at
 * it and simply surfaces the response tl;dv gives (a `404`-shaped
 * `BasicErrorResponse` throws as an ordinary action error; anything else is
 * returned as-is).
 */
interface Input {
  meetingId: string;
}

const transcriptGet: ActionDefinition<Input> = {
  key: "transcript-get",
  type: "read",
  resource: "transcript",
  title: "Get Transcript",
  description: "Get a meeting's transcript, one sentence per speaker turn.",
  params: [meetingIdParam],
  output: [
    { key: "id", type: "string", label: "Transcript id" },
    { key: "meetingId", type: "string", label: "Meeting id" },
    { key: "data", type: "array", label: "Sentences (speaker, text, startTime, endTime)" },
  ],

  execute(input, ctx) {
    return new TldvClient(ctx).get(
      `/meetings/${encodeURIComponent(input.meetingId)}/transcript`,
    );
  },
};

export default transcriptGet;
