import type { ActionDefinition } from "@w6w/types";
import { LoopClient } from "../lib/client.ts";

/**
 * List Destinations.
 *
 * `GET /destinations` (Destinations (Read) scope).
 */
type Input = Record<string, never>;

const action: ActionDefinition<Input> = {
  key: "destination-list",
  type: "read",
  resource: "destination",
  title: "List Destinations",
  description: "List the warehouse and donation destinations returns can be routed to.",
  params: [],
  output: [
    { key: "destinations", type: "array", label: "Destinations: id, type, name, enabled, address" },
  ],

  async execute(_input, ctx) {
    const res = await new LoopClient(ctx).get("/destinations") as Record<string, unknown>;
    return { destinations: res.destinations ?? [] };
  },
};

export default action;
