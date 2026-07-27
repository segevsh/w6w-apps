import type { ActionDefinition } from "@w6w/types";
import { PipedriveClient } from "../lib/client.ts";

interface Input {
  dealId: number;
}

/**
 * DELETE /deals/{id} — mark a deal as deleted. Pipedrive echoes back
 * `{ success, data: { id } }`. Safe to retry: deleting an already-deleted deal
 * is a no-op on the server side.
 */
const dealDelete: ActionDefinition<Input> = {
  key: "deal-delete",
  type: "perform",
  resource: "deal",
  title: "Delete Deal",
  description: "Delete a deal by ID.",
  idempotent: true,
  params: [
    { key: "dealId", label: "Deal ID", type: "number", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "data", type: "object", label: "Deleted deal id" },
  ],

  execute(input, ctx) {
    const client = new PipedriveClient(ctx);
    return client.request(`/deals/${encodeURIComponent(String(input.dealId))}`, {
      method: "DELETE",
    });
  },
};

export default dealDelete;
