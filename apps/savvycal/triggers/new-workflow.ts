import type { TriggerDefinition } from "@w6w/types";
import workflowList from "../actions/workflow-list.ts";
import { newRecords, readAllPages } from "../lib/snapshot.ts";

/**
 * Workflows in the scopes the user manages are a small bounded collection with no sort or filter
 * (`GET /v1/workflows`, https://api.savvycal.com/v1/spec, 2026-11-10): every check reads all pages
 * through `workflow-list` and diffs the ids (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-workflow",
  title: "New Workflow",
  description:
    "The run gets each SavvyCal workflow (reminder / follow-up automation) that appears.",
  output: [
    { key: "id", type: "string", label: "Workflow ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "state", type: "string", label: "State (draft, active, paused)" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "wkflw_01J5KCGG7RKRFGT8V2WD9Y8H6X",
    name: "Send confirmation email",
    state: "active",
    created_at: "2024-01-15T10:30:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return newRecords({ state, items: await readAllPages(workflowList, ctx) });
  },
};

export default trigger;
