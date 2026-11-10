import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { WORKSPACE_PARAMS } from "../lib/params.ts";
import { newRows } from "../lib/polls.ts";
import variableList from "../actions/variable-list.ts";

/**
 * `GET /api/v2/workspaces/{id}/vars` returns every variable of the workspace in one unpaged response
 * (https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables, read
 * 2026-11-10), with no timestamps, so each check diffs the ids against the previous one
 * (`pollSnapshot`, added only). A variable's `value` is NEVER put into the run (a non-sensitive
 * variable can still hold a credential): the run gets the key, category and flags.
 */
const newVariable: TriggerDefinition = {
  key: "new-variable",
  title: "New Variable",
  description:
    "The run gets each variable newly added to an HCP Terraform workspace: its key, category (terraform or env), sensitivity and description, never its value.",
  minIntervalMs: 300_000,
  params: [...WORKSPACE_PARAMS],
  output: [
    { key: "id", type: "string", label: "Variable ID" },
    { key: "key", type: "string", label: "Key" },
    { key: "category", type: "string", label: "Category (terraform or env)" },
    { key: "sensitive", type: "boolean", label: "Sensitive" },
    { key: "hcl", type: "boolean", label: "HCL" },
    { key: "description", type: "string", label: "Description" },
  ],
  sample: {
    id: "var-AD4pibb9nxo1468E",
    type: "vars",
    key: "region",
    category: "terraform",
    sensitive: false,
    hcl: false,
    description: "Deployment region",
  },
  async poll({ state, params }, ctx) {
    const action = variableList as unknown as ActionDefinition;
    const result = await action.execute({ ...(params as Record<string, unknown>) }, ctx) as {
      variables?: Array<Record<string, unknown>>;
    };
    const rows = new Map<string, Record<string, unknown>>();
    for (const v of Array.isArray(result?.variables) ? result.variables : []) {
      const id = v?.id;
      if (typeof id !== "string" || id === "") {
        throw new Error("Terraform variables list returned a variable without id");
      }
      rows.set(id, v);
    }
    return await newRows(state, rows, (row) => {
      const { value: _value, ...rest } = row;
      return rest;
    });
  },
};

export default newVariable;
