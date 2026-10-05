import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BitwardenClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "member-restore",
  type: "perform",
  resource: "member",
  title: "Restore a member",
  description: "Restore a revoked member's access. 400 if the member is not revoked.",
  idempotent: true,
  params: [
    { key: "memberId", label: "Member ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when accepted" },
    { key: "id", type: "string", label: "The member id" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = assertUuid(p.memberId, "memberId");
    await new BitwardenClient(ctx).request(`/members/${id}/restore`, { method: "POST" });
    return { ok: true, id };
  },
};

export default action;
