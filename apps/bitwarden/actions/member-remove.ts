import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BitwardenClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "member-remove",
  type: "perform",
  resource: "member",
  title: "Remove a member",
  description:
    "Remove a member from the organization (their account is untouched). Different from revoke: a removed member must be re-invited, a revoked one can be restored. Empty 200 on success.",
  idempotent: true,
  params: [
    { key: "memberId", label: "Member ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "removed", type: "boolean", label: "True when accepted" },
    { key: "id", type: "string", label: "The id removed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = assertUuid(p.memberId, "memberId");
    await new BitwardenClient(ctx).request(`/members/${id}`, { method: "DELETE" });
    return { removed: true, id };
  },
};

export default action;
