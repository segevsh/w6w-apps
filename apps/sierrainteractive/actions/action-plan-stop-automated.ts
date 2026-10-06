import type { ActionDefinition } from "@w6w/types";
import { compact, SierraClient } from "../lib/client.ts";

interface Input {
  actionPlanId: number;
  leadIdOrEmailOrPhone: string;
  note?: string;
  actionPlanStatus?: string;
}

/** `PUT /zapier/v2/stopFullyAutomatedActionPlan` - body `ActionPlanStopModel_v2`. */
const actionPlanStopAutomated: ActionDefinition<Input> = {
  key: "action-plan-stop-automated",
  type: "perform",
  resource: "action-plan",
  title: "Stop Fully Automated Action Plan",
  description: "Stop a fully automated action plan on a lead, optionally recording why.",
  idempotent: true,
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
      key: "actionPlanStatus",
      label: "Stop status",
      type: "string",
      hint: "A value from List Fully Automated Stop Statuses.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Sierra's response" }],

  async execute(input, ctx) {
    return await new SierraClient(ctx).request(
      "PUT",
      "/zapier/v2/stopFullyAutomatedActionPlan",
      compact({
        actionPlanId: input.actionPlanId,
        leadIdOrEmailOrPhone: input.leadIdOrEmailOrPhone,
        note: input.note,
        actionPlanStatus: input.actionPlanStatus,
      }),
    );
  },
};

export default actionPlanStopAutomated;
