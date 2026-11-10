import type { TriggerDefinition } from "@w6w/types";
import workflowRulesList from "../actions/workflow-rules-list.ts";
import { newRecords } from "../lib/snapshot.ts";

/**
 * The rules of one workflow the user picks are a small bounded array
 * (`GET /v1/workflows/{workflow_id}/rules`, https://api.savvycal.com/v1/spec, 2026-11-10): every
 * check reads it through `workflow-rules-list` and diffs the ids (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition<{ workflowId?: string }> = {
  key: "new-workflow-rule",
  title: "New Workflow Rule",
  description: "The run gets each rule that is added to one SavvyCal workflow.",
  params: [{
    key: "workflowId",
    label: "Workflow ID",
    type: "string",
    required: true,
    hint: "The workflow to watch (wkflw_…); see the List Workflows action.",
  }],
  output: [
    { key: "id", type: "string", label: "Rule ID" },
    { key: "trigger_type", type: "string", label: "Trigger type (e.g. event_created)" },
    { key: "trigger_offset_amount", type: "number", label: "Offset amount" },
    { key: "trigger_offset_unit", type: "string", label: "Offset unit (minutes, hours, days)" },
    { key: "trigger_offset_direction", type: "string", label: "Offset direction (before, after)" },
    { key: "actions", type: "array", label: "Actions" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "wrule_01J5KCJJ9TKRFGT8V2WD9Y8H6X",
    trigger_type: "event_created",
    trigger_offset_amount: 10,
    trigger_offset_unit: "minutes",
    trigger_offset_direction: "after",
    actions: [{ id: "waction_01J5KCMM1VKRFGT8V2WD9Y8H6X", type: "send_custom_email" }],
    created_at: "2024-01-15T10:30:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const workflowId = typeof params.workflowId === "string" ? params.workflowId.trim() : "";
    if (!workflowId) throw new Error("Workflow ID is required.");
    const res = await workflowRulesList.execute({ workflowId }, ctx) as { rules?: unknown[] };
    return newRecords({ state, items: Array.isArray(res?.rules) ? res.rules : [] });
  },
};

export default trigger;
