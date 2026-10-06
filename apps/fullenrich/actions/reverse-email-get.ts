import type { ActionDefinition } from "@w6w/types";
import { FullEnrichClient, seg } from "../lib/client.ts";
import { type BulkResult, RESULT_OUTPUT, shapeResult } from "../lib/bulk.ts";

interface Input {
  enrichmentId: string;
}

/**
 * `GET /contact/reverse/email/bulk/{enrichment_id}`. The reference documents
 * HTTP 402 with a full result document (status `CREDITS_INSUFFICIENT`) for this
 * endpoint, so 402 is returned as a result rather than thrown.
 */
const reverseEmailGet: ActionDefinition<Input> = {
  key: "reverse-email-get",
  type: "read",
  resource: "reverse-email",
  title: "Get Reverse Email Result",
  description:
    "Read a reverse email lookup. Check `status`: only FINISHED is complete; CREDITS_INSUFFICIENT means the workspace ran out of credits.",
  params: [{ key: "enrichmentId", label: "Reverse lookup ID", type: "string", required: true }],
  output: RESULT_OUTPUT,

  async execute(input, ctx) {
    const res = await new FullEnrichClient(ctx).request<BulkResult>(
      "GET",
      `/contact/reverse/email/bulk/${seg(input.enrichmentId)}`,
      { okStatuses: [402] },
    );
    return shapeResult(res);
  },
};

export default reverseEmailGet;
