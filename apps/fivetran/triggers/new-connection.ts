import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import connectionList from "../actions/connection-list.ts";

/**
 * Small bounded collection: `GET /v1/connections` is cursor-paginated (limit up to 1000) and an
 * account holds hundreds of pipelines at most. The action follows the cursor for up to six pages;
 * `pollSnapshot` then throws an error naming its 5000-row cap, so an account beyond the cap fails
 * loudly instead of silently dropping connections.
 */
const trigger: TriggerDefinition = {
  key: "new-connection",
  title: "New Connection",
  description: "The run gets each Fivetran connection newly created in the account.",
  output: [
    { key: "id", type: "string", label: "Connection ID" },
    { key: "group_id", type: "string", label: "Group (destination) ID" },
    { key: "service", type: "string", label: "Connector type" },
    { key: "schema", type: "string", label: "Destination schema" },
    { key: "created_at", type: "string", label: "Created at (ISO 8601)" },
  ],
  sample: {
    id: "iodize_impressive",
    group_id: "projected_sickle",
    service: "postgres",
    schema: "public",
    created_at: "2026-11-09T12:00:00.000000Z",
    paused: false,
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await connectionList.execute({ returnAll: true, maxPages: 6 }, ctx) as {
      connections?: Array<{ id?: unknown }>;
    };
    const connections = Array.isArray(out?.connections) ? out.connections : [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: connections.map((connection) => ({
        key: String(connection.id ?? ""),
        values: connection,
      })),
      emit: { added: true, updated: false, removed: false },
      maxRows: 5000,
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
