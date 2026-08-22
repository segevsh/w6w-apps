import type { ActionDefinition } from "@w6w/types";
import { VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/policies` — the written policies and who has accepted them.
 *
 * Policies are the part of compliance that involves everybody: an information
 * security policy exists only if the staff have read and accepted the current
 * version, and a policy updated last month resets every acceptance.
 *
 * That makes this the source for two workflows worth automating — reminding
 * people who have not accepted, and noticing a policy overdue for its annual
 * review. `person-list` filtered to overdue tasks answers the first from the
 * other direction, and the two together are the whole picture.
 */
const action: ActionDefinition = {
  key: "policy-list",
  type: "read",
  resource: "policy",
  title: "List policies",
  description:
    "Written policies and their approval state. A policy updated last month resets every " +
    "acceptance, which is why the reminder workflow is a recurring job rather than a one-off.",
  params: [...LIST_PARAMS],
  output: [
    { key: "policies", type: "array", label: "Policies" },
    { key: "count", type: "number", label: "Policies returned" },
    { key: "hasNextPage", type: "boolean", label: "True when the walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const page = await client.pageAll("/policies", {}, want, Math.max(1, Number(p.maxPages ?? 50)));
    return { policies: page.items, count: page.items.length, hasNextPage: page.hasNextPage };
  },
};

export default action;
