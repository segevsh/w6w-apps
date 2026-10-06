import type { ActionDefinition } from "@w6w/types";
import { FullEnrichClient, seg } from "../lib/client.ts";
import { type BulkResult, RESULT_OUTPUT, shapeResult } from "../lib/bulk.ts";

interface Input {
  enrichmentId: string;
  forceResults?: boolean;
}

/** `GET /contact/enrich/bulk/{enrichment_id}` — poll until `status` is `FINISHED`. */
const enrichGet: ActionDefinition<Input> = {
  key: "enrich-get",
  type: "read",
  resource: "enrichment",
  title: "Get Enrichment Result",
  description:
    "Read an enrichment started with Start Contact Enrichment. Check `status`: only FINISHED is complete (typically 30-90 seconds per contact). Results are kept for 3 months.",
  params: [
    { key: "enrichmentId", label: "Enrichment ID", type: "string", required: true },
    {
      key: "forceResults",
      label: "Force partial results",
      type: "boolean",
      hint:
        "Return what has been found so far even if unfinished. May be incomplete; not for routine use.",
    },
  ],
  output: RESULT_OUTPUT,

  async execute(input, ctx) {
    const res = await new FullEnrichClient(ctx).request<BulkResult>(
      "GET",
      `/contact/enrich/bulk/${seg(input.enrichmentId)}`,
      { query: { forceResults: input.forceResults ? true : undefined } },
    );
    return shapeResult(res);
  },
};

export default enrichGet;
