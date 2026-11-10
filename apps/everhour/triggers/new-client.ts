import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import clientList from "../actions/client-list.ts";

/**
 * Small bounded collection: `GET /clients` answers every client in one response with no
 * pagination support (https://developers.everhour.com/pagination.md). The set is diffed each
 * check and only additions are emitted (edits and removals are not); `pollSnapshot` throws past
 * 5000 rows.
 */
const trigger: TriggerDefinition = {
  key: "new-client",
  title: "New Client",
  description: "The run gets each client newly added to the Everhour account.",
  output: [
    { key: "id", type: "number", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "projects", type: "array", label: "Project IDs" },
    { key: "budget", type: "object", label: "Budget" },
  ],
  sample: { id: 101, name: "Acme Corp", projects: ["ev:1234"], budget: null },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await clientList.execute({}, ctx) as unknown;
    const clients = Array.isArray(out) ? out as Array<{ id?: unknown }> : [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: clients.map((client) => ({ key: String(client.id ?? ""), values: client })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
