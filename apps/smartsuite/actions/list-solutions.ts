import type { ActionDefinition } from "@w6w/types";
import { SmartSuiteClient } from "../lib/client.ts";

/**
 * `GET /solutions/` — every Solution in the workspace.
 *
 * The response is a **bare array** of Solution objects (no pagination
 * envelope), so it is returned verbatim. A Solution is SmartSuite's top-level
 * container; its Tables come from `list-tables`.
 */
const listSolutions: ActionDefinition<Record<string, never>, unknown[]> = {
  key: "list-solutions",
  type: "read",
  resource: "solution",
  title: "List Solutions",
  description: "List every Solution in the SmartSuite workspace (GET /solutions/).",
  params: [],
  output: [
    { key: "[]", type: "array", label: "Solutions — a bare array, not an envelope" },
  ],

  async execute(_input, ctx) {
    const solutions = await new SmartSuiteClient(ctx).request<unknown[]>("solutions/");
    return Array.isArray(solutions) ? solutions : [];
  },
};

export default listSolutions;
