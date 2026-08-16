import type { ActionDefinition } from "@w6w/types";
import { bareId, compact, LinkedInAdsClient } from "../lib/client.ts";

interface Input {
  segmentId: string;
  name?: string;
  description?: string;
  sourceSegmentId?: string;
  accessPolicy?: string;
}

/**
 * `POST /rest/dmpSegments/{id}`, header `X-RestLi-Method: PARTIAL_UPDATE`,
 * body `{ patch: { $set: {...} } }` — a plain single update. LinkedIn
 * documents exactly four mutable fields: `name`, `description`,
 * `sourceSegmentId`, and `accessPolicy` (observed value `PRIVATE` on every
 * sample response; the vendor's docs don't enumerate the full value set, so
 * Access policy is a free-text field here rather than a guessed enum).
 * `type`, `sourcePlatform` and `account` are immutable after creation.
 */
const audienceSegmentUpdate: ActionDefinition<Input> = {
  key: "audience-segment-update",
  type: "perform",
  resource: "audience-segment",
  title: "Update Audience Segment",
  description: "Change a Matched Audiences (DMP) segment's name, description, source segment " +
    "ID or access policy.",
  idempotent: true,
  params: [
    {
      key: "segmentId",
      label: "Segment ID",
      type: "string",
      required: true,
      hint: "The numeric DMP segment id.",
    },
    { key: "name", label: "New name", type: "string" },
    { key: "description", label: "New description", type: "text" },
    { key: "sourceSegmentId", label: "New source segment ID", type: "string", advanced: true },
    {
      key: "accessPolicy",
      label: "New access policy",
      type: "string",
      advanced: true,
      hint: 'LinkedIn documents this as free text; every observed segment carries "PRIVATE".',
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Update accepted" }],

  async execute(input, ctx) {
    const set = compact({
      name: input.name,
      description: input.description,
      sourceSegmentId: input.sourceSegmentId,
      accessPolicy: input.accessPolicy,
    });
    if (Object.keys(set).length === 0) {
      throw new Error("Set at least one of: name, description, sourceSegmentId, accessPolicy");
    }

    const client = new LinkedInAdsClient(ctx);
    await client.request(`/rest/dmpSegments/${bareId(input.segmentId)}`, {
      method: "POST",
      restliMethod: "PARTIAL_UPDATE",
      body: { patch: { $set: set } },
    });
    return { ok: true };
  },
};

export default audienceSegmentUpdate;
