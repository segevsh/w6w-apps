import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, encodeId } from "../lib/client.ts";

/**
 * `GET /api/v2/quotations/{quotationId}` — Get one quotation by id.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  quotationId: number;
}

const quotationGet: ActionDefinition<Input> = {
  key: "quotation-get",
  type: "read",
  resource: "quotation",
  title: "Get Quotation",
  description: "Get one quotation by id.",
  params: [
    {
      key: "quotationId",
      label: "Quotation ID",
      type: "number",
      required: true,
      hint: "Numeric Axonaut id of the quotation.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Quotation ID" },
    { key: "number", type: "string", label: "Number" },
    { key: "status", type: "string", label: "Status" },
    { key: "company_id", type: "number", label: "Company ID" },
    { key: "date", type: "string", label: "Date" },
    { key: "expiry_date", type: "string", label: "Expiry date" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).one(`/quotations/${encodeId(input.quotationId)}`);
  },
};

export default quotationGet;
