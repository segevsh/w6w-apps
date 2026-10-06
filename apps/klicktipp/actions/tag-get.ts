import type { ActionDefinition } from "@w6w/types";
import { kt, seg } from "../lib/client.ts";

interface Input {
  tagId: number;
}

/** Return the name and description of a tag, manual or smart, by ID. */
const tagGet: ActionDefinition<Input> = {
  key: "tag-get",
  type: "read",
  resource: "tag",
  title: "Get Tag",
  description: "Return the name and description of a tag, manual or smart, by ID.",
  params: [
    {
      key: "tagId",
      label: "Tag ID",
      type: "number",
      required: true,
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "tagId", type: "string", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "text", type: "string", label: "Description" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "tag-get");
    const tag = await kt(ctx, "GET", `/tag/${seg(input.tagId, "tagId")}`) as {
      tagid?: string;
      name?: string;
      text?: string;
    };
    return { tagId: tag.tagid ?? String(input.tagId), name: tag.name ?? "", text: tag.text ?? "" };
  },
};

export default tagGet;
