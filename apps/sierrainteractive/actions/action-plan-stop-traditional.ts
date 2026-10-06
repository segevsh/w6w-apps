import type { ActionDefinition } from "@w6w/types";
import { compact, SierraClient } from "../lib/client.ts";

interface Input {
  actionPlanId: number;
  leadIdOrEmailOrPhone: string;
  note?: string;
}

/** `PUT /zapier/stopTraditionalActionPlan` - body `ActionPlanStopModel`. */
const actionPlanStopTraditional: ActionDefinition<Input> = {
  key: "action-plan-stop-traditional",
  type: "perform",
  resource: "action-plan",
  title: "Stop Traditional Action Plan",
  description: "Stop a traditional action plan on a lead.",
  idempotent: true,
  params: [
    {
      key: "actionPlanId",
      label: "Action plan ID",
      type: "number",
      required: true,
      hint: "An id from List Traditional Action Plans.",
    },
    {
      key: "leadIdOrEmailOrPhone",
      label: "Lead ID, email or phone",
      type: "string",
      required: true,
    },
    { key: "note", label: "Note", type: "text" },
  ],
  output: [{ key: "data", type: "object", label: "Sierra's response" }],

  async execute(input, ctx) {
    return await new SierraClient(ctx).request(
      "PUT",
      "/zapier/stopTraditionalActionPlan",
      compact({
        actionPlanId: input.actionPlanId,
        leadIdOrEmailOrPhone: input.leadIdOrEmailOrPhone,
        note: input.note,
      }),
    );
  },
};

export default actionPlanStopTraditional;
