import type { ActionDefinition } from "@w6w/types";
import { MightyClient, seg } from "../lib/client.ts";

/** `DELETE /members/{member_id}/tags/{tag_id}/` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  memberId: number;
  tagId: number;
}

const memberTagRemove: ActionDefinition<Input> = {
  key: "member-tag-remove",
  type: "perform",
  resource: "member-tag",
  title: "Remove Tag from Member",
  description: "Remove a tag from a member.",
  idempotent: true,
  params: [
    {
      key: "memberId",
      label: "Member ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "tagId",
      label: "Tag ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "True when the API accepted the request" },
  ],

  async execute(input, ctx) {
    await new MightyClient(ctx).request(
      `/members/${seg(input.memberId)}/tags/${seg(input.tagId)}/`,
      { method: "DELETE" },
    );
    return { success: true };
  },
};

export default memberTagRemove;
