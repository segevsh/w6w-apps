import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient } from "../lib/client.ts";

/**
 * `DELETE /v1/deals/{dealId}/` — Delete a deal. Clientify answers 204 with no body, so the action returns `{ deleted: true, id }`.
 */
interface Input {
  dealId: string;
}

const dealDelete: ActionDefinition<Input, unknown> = {
  key: "deal-delete",
  type: "perform",
  resource: "deal",
  title: "Delete Deal",
  description:
    "Delete a deal. Clientify answers 204 with no body, so the action returns `{ deleted: true, id }`.",
  idempotent: true,
  params: [
    { key: "dealId", label: "Deal ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Deleted record id" },
  ],

  async execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    await client.request(`/v1/deals/${encodeURIComponent(input.dealId)}/`, { method: "DELETE" });
    return { deleted: true, id: input.dealId };
  },
};

export default dealDelete;
