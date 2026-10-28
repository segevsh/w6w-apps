import type { ActionDefinition } from "@w6w/types";
import { bareId, LinkedInAdsClient } from "../lib/client.ts";

interface Input {
  segmentId: string;
}

/**
 * `DELETE /rest/dmpSegments/{id}` — deletes the segment **and everything
 * tied to it**: its destinations, the corresponding Ad Segment, and any DMP
 * segment list, per the vendor's own note. Requires write access to the
 * owning sponsored account (otherwise `403`). Idempotent in effect (a
 * repeat delete of an already-gone segment is a `404`, a terminal state
 * either way), but not marked so here since a 404 on retry is still a
 * caller-visible failure rather than a silent no-op.
 */
const audienceSegmentDelete: ActionDefinition<Input> = {
  key: "audience-segment-delete",
  type: "perform",
  resource: "audience-segment",
  title: "Delete Audience Segment",
  description: "Permanently delete a Matched Audiences (DMP) segment and its destinations.",
  idempotent: false,
  params: [
    {
      key: "segmentId",
      label: "Segment ID",
      type: "string",
      required: true,
      hint: "The numeric DMP segment id.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Delete accepted" }],

  async execute(input, ctx) {
    const client = new LinkedInAdsClient(ctx);
    await client.request(`/rest/dmpSegments/${bareId(input.segmentId)}`, { method: "DELETE" });
    return { ok: true };
  },
};

export default audienceSegmentDelete;
