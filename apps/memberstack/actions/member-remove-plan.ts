import type { ActionDefinition } from "@w6w/types";
import { MemberstackClient } from "../lib/client.ts";
import { memberIdParam, planIdParam } from "../lib/params.ts";

/**
 * `POST /members/:id/remove-plan` — FREE plans only. Answers `200` with no body. What happens
 * when the plan is not on the member is not documented, so this is not
 * marked idempotent.
 */
interface Input {
  memberId: string;
  planId: string;
}

const memberRemovePlan: ActionDefinition<Input> = {
  key: "member-remove-plan",
  type: "perform",
  resource: "member",
  title: "Remove Free Plan from Member",
  description: "Remove a free plan from a member. Revokes access immediately.",
  idempotent: false,
  params: [memberIdParam, planIdParam],
  output: [
    { key: "memberId", type: "string", label: "Member ID" },
    { key: "planId", type: "string", label: "Plan ID" },
    { key: "ok", type: "boolean", label: "Request accepted" },
  ],

  async execute(input, ctx) {
    await new MemberstackClient(ctx).json(
      `/members/${encodeURIComponent(input.memberId)}/remove-plan`,
      { method: "POST", body: { planId: input.planId } },
    );
    return { memberId: input.memberId, planId: input.planId, ok: true };
  },
};

export default memberRemovePlan;
