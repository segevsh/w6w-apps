import type { ActionDefinition } from "@w6w/types";
import { compact, MightyClient, seg } from "../lib/client.ts";

/** `POST /members/{member_id}/tags` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  memberId: number;
  tagId: number;
}

const memberTagAdd: ActionDefinition<Input> = {
  key: "member-tag-add",
  type: "perform",
  resource: "member-tag",
  title: "Add Tag to Member",
  description: "Tag a member.",
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
    { key: "id", type: "number", label: "Tag id" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Description" },
    { key: "color", type: "string", label: "Hex color" },
    { key: "custom_field_id", type: "number", label: "Custom field the tag belongs to" },
  ],

  execute(input, ctx) {
    return new MightyClient(ctx).request(`/members/${seg(input.memberId)}/tags`, {
      method: "POST",
      body: compact({ tag_id: input.tagId }),
    });
  },
};

export default memberTagAdd;
