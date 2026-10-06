import type { ActionDefinition } from "@w6w/types";
import { compact, DubClient, seg } from "../lib/client.ts";
import { TAG_COLORS, TAG_OUTPUT } from "../lib/tags.ts";

interface Input {
  tagId: string;
  name?: string;
  color?: string;
}

/** `PATCH /tags/{id}`. */
const tagUpdate: ActionDefinition<Input> = {
  key: "tag-update",
  type: "perform",
  resource: "tag",
  title: "Update Tag",
  description: "Rename a tag or change its color.",
  idempotent: true,
  params: [
    { key: "tagId", label: "Tag ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", validation: { maxLength: 190 } },
    { key: "color", label: "Color", type: "select", options: TAG_COLORS },
  ],
  output: TAG_OUTPUT,

  execute(input, ctx) {
    return new DubClient(ctx).request("PATCH", `/tags/${seg(input.tagId)}`, {
      body: compact({ name: input.name, color: input.color }),
    });
  },
};

export default tagUpdate;
