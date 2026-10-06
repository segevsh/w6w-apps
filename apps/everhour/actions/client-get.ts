import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `GET /clients/{clientId}` — Fetch one client, including its budget.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  clientId: number;
}

const clientGet: ActionDefinition<Input> = {
  key: "client-get",
  type: "read",
  resource: "client",
  title: "Get Client",
  description: "Fetch one client, including its budget.",
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
    { key: "id", type: "number", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "projects", type: "array", label: "Project IDs" },
    { key: "budget", type: "object", label: "Budget" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/clients/${encodeId(input.clientId)}`);
  },
};

export default clientGet;
