import type { ActionDefinition } from "@w6w/types";
import { DropcontactClient, ENRICH_PATH, isNotReady } from "../lib/client.ts";

interface Input {
  requestId: string;
  forceResults?: boolean;
}

/**
 * `GET /v1/enrich/all/{request_id}`. While the batch is processing the vendor answers HTTP 200
 * `{"error":false,"success":false,"reason":"Request not ready yet, try again in 30 seconds"}`;
 * that is returned as `ready: false`, not thrown. `forceResults=true` returns what is done so
 * far, with unprocessed contacts echoed back unchanged.
 */
const getEnrichmentResult: ActionDefinition<Input> = {
  key: "get-enrichment-result",
  type: "read",
  resource: "enrichment",
  title: "Get Enrichment Result",
  description:
    "Fetch the result of a batch by request ID. Returns ready: false while Dropcontact " +
    "is still processing (retry in about 30 seconds), or set Force results to take what is done " +
    "so far (unprocessed contacts come back unchanged).",
  params: [
    {
      key: "requestId",
      label: "Request ID",
      type: "string",
      required: true,
      hint: "The request_id returned by Submit Enrichment Batch.",
    },
    {
      key: "forceResults",
      label: "Force results",
      type: "boolean",
      hint:
        "Return partial results now. Contacts not processed yet are returned as you sent them, " +
        "and may still be charged later if Dropcontact finds an email afterwards.",
    },
  ],
  output: [
    { key: "ready", type: "boolean", label: "True when the result data is present" },
    { key: "data", type: "array", label: "Enriched contacts (empty while not ready)" },
    { key: "count", type: "number", label: "Number of contacts returned" },
    { key: "creditsLeft", type: "number", label: "Credits left" },
    { key: "reason", type: "string", label: "Vendor message while not ready" },
  ],

  async execute(input, ctx) {
    const id = String(input.requestId ?? "").trim();
    if (!id) throw new Error("requestId is required");
    const { body } = await new DropcontactClient(ctx).request(
      "GET",
      `${ENRICH_PATH}/${encodeURIComponent(id)}`,
      { query: { forceResults: input.forceResults === true ? true : undefined } },
    );
    const data = Array.isArray(body.data) ? body.data : [];
    const ready = !isNotReady(body) && Array.isArray(body.data);
    return {
      ready,
      data,
      count: data.length,
      creditsLeft: body.credits_left,
      reason: ready ? undefined : body.reason,
    };
  },
};

export default getEnrichmentResult;
