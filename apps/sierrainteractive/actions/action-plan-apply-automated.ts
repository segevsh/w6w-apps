import type { ActionDefinition } from "@w6w/types";
import { compact, SierraClient } from "../lib/client.ts";

interface Input {
  actionPlanId: number;
  leadIdOrEmailOrPhone: string;
  note?: string;
  startNextDayIfAppliedAfter?: string;
}

/** `PUT /zapier/applyFullyAutomatedActionPlan` - body `ActionPlanApplyModel`. */
const actionPlanApplyAutomated: ActionDefinition<Input> = {
  key: "action-plan-apply-automated",
  type: "perform",
  resource: "action-plan",
  title: "Apply Fully Automated Action Plan",
  description: "Apply a fully automated action plan to a lead.",
  // Re-applying a plan to a lead that already runs it may restart it; not safe to retry.
  idempotent: false,
  params: [
    {
      key: "actionPlanId",
      label: "Action plan ID",
      type: "number",
      required: true,
      hint: "An id from List Fully Automated Action Plans.",
    },
    {
      key: "leadIdOrEmailOrPhone",
      label: "Lead ID, email or phone",
      type: "string",
      required: true,
    },
    { key: "note", label: "Note", type: "text" },
    {
      key: "startNextDayIfAppliedAfter",
      label: "Start next day if applied after",
      type: "string",
      hint: "A value from List Start-Next-Day Values.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Sierra's response" }],

  async execute(input, ctx) {
    return await new SierraClient(ctx).request(
      "PUT",
      "/zapier/applyFullyAutomatedActionPlan",
      compact({
        actionPlanId: input.actionPlanId,
        leadIdOrEmailOrPhone: input.leadIdOrEmailOrPhone,
        note: input.note,
        startNextDayIfAppliedAfter: input.startNextDayIfAppliedAfter,
      }),
    );
  },
};

export default actionPlanApplyAutomated;
