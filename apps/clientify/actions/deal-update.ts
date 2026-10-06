import type { ActionDefinition } from "@w6w/types";
import { asObject, ClientifyClient, compact } from "../lib/client.ts";

/**
 * `PATCH /v1/deals/{dealId}/` — Update a deal (PATCH): only the fields sent change.
 */
interface Input {
  dealId: string;
  name?: string;
  amount?: string;
  dealSource?: string;
  expectedClosedDate?: string;
  extra?: unknown;
}

const dealUpdate: ActionDefinition<Input, unknown> = {
  key: "deal-update",
  type: "perform",
  resource: "deal",
  title: "Update Deal",
  description: "Update a deal (PATCH): only the fields sent change.",
  idempotent: true,
  params: [
    { key: "dealId", label: "Deal ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "amount", label: "Amount", type: "string" },
    { key: "dealSource", label: "Deal source", type: "string" },
    { key: "expectedClosedDate", label: "Expected close date", type: "date" },
    {
      key: "extra",
      label: "Extra fields",
      type: "json",
      hint:
        "Further body fields as a JSON object (anything the Clientify API accepts that is not listed above, e.g. custom_fields). Named parameters win on a clash.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id" },
    { key: "url", type: "string", label: "Record URL" },
    { key: "name", type: "string", label: "Deal name" },
    { key: "status_desc", type: "string", label: "Deal status" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/deals/${encodeURIComponent(input.dealId)}/`, {
      method: "PATCH",
      body: compact({
        ...asObject(input.extra, "extra"),
        name: input.name,
        amount: input.amount,
        deal_source: input.dealSource,
        expected_closed_date: input.expectedClosedDate,
      }),
    });
  },
};

export default dealUpdate;
