import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BitwardenClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "member-revoke",
  type: "perform",
  resource: "member",
  title: "Revoke a member's access",
  description:
    "Suspend a member's access to the organization without removing them; reverse with `member-restore`. 400 if the member is already revoked or is an owner you cannot revoke.",
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
    await new BitwardenClient(ctx).request(`/members/${id}/revoke`, { method: "POST" });
    return { ok: true, id };
  },
};

export default action;
