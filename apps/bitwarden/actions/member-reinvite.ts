import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BitwardenClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "member-reinvite",
  type: "perform",
  resource: "member",
  title: "Re-send an invitation",
  description:
    "Send a pending member their invitation email again. Fails with 400 if the member is not in the Invited state. Sends an email each call.",
  idempotent: false,
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
    await new BitwardenClient(ctx).request(`/members/${id}/reinvite`, { method: "POST" });
    return { ok: true, id };
  },
};

export default action;
