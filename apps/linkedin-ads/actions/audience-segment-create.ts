import type { ActionDefinition } from "@w6w/types";
import { compact, LinkedInAdsClient, sponsoredAccountUrn } from "../lib/client.ts";
import { accountIdParam, dmpSegmentTypeOptions, dmpSourcePlatformOptions } from "../lib/params.ts";

interface Input {
  accountId: string;
  name: string;
  type: string;
  sourcePlatform: string;
  description?: string;
  sourceSegmentId?: string;
}

/**
 * `POST /rest/dmpSegments` — creates an **empty** Matched Audiences (DMP)
 * segment. LinkedIn maps it to an `adSegment` asynchronously (`destinations[].status`
 * starts `BUILDING`); populating it with members/companies is a separate,
 * higher-volume streaming or CSV-list-upload API this app doesn't cover —
 * see the README.
 *
 * `destinations` is hardcoded to `[{ destination: "LINKEDIN" }]`: the
 * vendor's own doc says "Currently, the only accepted value is LINKEDIN".
 *
 * A sponsored account may hold at most 1,000 DMP segments; exceeding it
 * answers `429 SEGMENT_LIMIT_EXCEEDED`, surfaced verbatim by
 * `formatLinkedInAdsError`.
 *
 * The new segment's numeric id comes back in `x-restli-id`, surfaced as
 * `{ id }`. Not `idempotent`: no create-time dedupe key is documented.
 */
const audienceSegmentCreate: ActionDefinition<Input> = {
  key: "audience-segment-create",
  type: "perform",
  resource: "audience-segment",
  title: "Create Audience Segment",
  description: "Create an empty Matched Audiences (DMP) segment tied to an Ad Account. " +
    "Requires the Matched Audiences auth method (a separately-approved LinkedIn program).",
  idempotent: false,
  params: [
    accountIdParam,
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Content type",
      type: "select",
      required: true,
      options: dmpSegmentTypeOptions,
    },
    {
      key: "sourcePlatform",
      label: "Source platform",
      type: "select",
      required: true,
      default: "DIRECT_API",
      options: dmpSourcePlatformOptions.filter((o) => o.value !== "LIST_UPLOAD"),
      hint: "LIST_UPLOAD is for CSV-sourced segments, not created through this action.",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "sourceSegmentId",
      label: "Source segment ID",
      type: "string",
      advanced: true,
      hint: "Your own foreign key for this segment on the source platform. Indexed; optional.",
    },
  ],
  output: [{ key: "id", type: "string", label: "DMP Segment ID" }],

  async execute(input, ctx) {
    const client = new LinkedInAdsClient(ctx);
    const result = await client.request<{ id: string }>("/rest/dmpSegments", {
      method: "POST",
      body: {
        name: input.name,
        type: input.type,
        sourcePlatform: input.sourcePlatform,
        account: sponsoredAccountUrn(input.accountId),
        destinations: [{ destination: "LINKEDIN" }],
        ...compact({ description: input.description, sourceSegmentId: input.sourceSegmentId }),
      },
    });
    return { id: result.id };
  },
};

export default audienceSegmentCreate;
