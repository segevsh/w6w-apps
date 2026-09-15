import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";

/**
 * `GET /api/v3/iterations` — every Iteration. Answers a bare, unbounded JSON
 * array; this endpoint has no pagination parameters.
 */
const iterationList: ActionDefinition<Record<string, never>> = {
  key: "iteration-list",
  type: "search",
  resource: "iteration",
  title: "List Iterations",
  description: "List every Iteration in the connected workspace.",
  params: [],
  output: [{ key: "data", type: "array", label: "Iterations" }],

  execute(_input, ctx) {
    return new ShortcutClient(ctx).get("/iterations");
  },
};

export default iterationList;
