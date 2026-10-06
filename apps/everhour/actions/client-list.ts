import type { ActionDefinition } from "@w6w/types";
import { EverhourClient } from "../lib/client.ts";

/**
 * `GET /clients` — List clients, optionally filtered by name.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  query?: string;
}

const clientList: ActionDefinition<Input> = {
  key: "client-list",
  type: "search",
  resource: "client",
  title: "List Clients",
  description: "List clients, optionally filtered by name.",
  params: [
    { key: "query", label: "Name contains", type: "string", hint: "Search clients by name." },
  ],
  output: [
    { key: "id", type: "number", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "projects", type: "array", label: "Project IDs" },
    { key: "budget", type: "object", label: "Budget" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/clients`, { query: { "query": input.query } });
  },
};

export default clientList;
