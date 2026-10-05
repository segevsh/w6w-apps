import type { ActionDefinition } from "@w6w/types";
import { MemberstackClient } from "../lib/client.ts";
import { memberIdParam, planIdParam } from "../lib/params.ts";

/**
 * `POST /members/:id/add-plan` — FREE plans only. Answers `200` with no body. What happens
 * when the plan is already on the member is not documented, so this is not
 * marked idempotent.
 */
interface Input {
  memberId: string;
  planId: string;
}

const memberAddPlan: ActionDefinition<Input> = {
  key: "member-add-plan",
  type: "perform",
  resource: "member",
  title: "Add Free Plan to Member",
  description: "Add a free plan to a member. Paid plans are not supported.",
  idempotent: false,
  params: [memberIdParam, planIdParam],
  output: [
    { key: "memberId", type: "string", label: "Member ID" },
    { key: "planId", type: "string", label: "Plan ID" },
    { key: "ok", type: "boolean", label: "Request accepted" },
  ],

  async execute(input, ctx) {
    await new MemberstackClient(ctx).json(
      `/members/${encodeURIComponent(input.memberId)}/add-plan`,
      { method: "POST", body: { planId: input.planId } },
    );
    return { memberId: input.memberId, planId: input.planId, ok: true };
  },
};

export default memberAddPlan;
