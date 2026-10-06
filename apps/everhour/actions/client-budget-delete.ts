import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /clients/{clientId}/budget` — Remove a client's budget.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  clientId: number;
}

const clientBudgetDelete: ActionDefinition<Input> = {
  key: "client-budget-delete",
  type: "perform",
  resource: "client",
  title: "Delete Client Budget",
  description: "Remove a client's budget.",
  idempotent: true,
  params: [
    {
      key: "clientId",
      label: "Client ID",
      type: "number",
      required: true,
      hint: "Numeric Everhour client id (from List Clients).",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when the delete succeeded" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/clients/${encodeId(input.clientId)}/budget`, {
      method: "DELETE",
    });
  },
};

export default clientBudgetDelete;
