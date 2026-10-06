import type { ActionDefinition } from "@w6w/types";
import { compact, expectTrue, kt, seg } from "../lib/client.ts";

interface Input {
  tagId: number;
  name?: string;
  text?: string;
}

/** Rename a manual tag or change its description. Smart tags cannot be updated. */
const tagUpdate: ActionDefinition<Input> = {
  key: "tag-update",
  type: "perform",
  resource: "tag",
  title: "Update Tag",
  description: "Rename a manual tag or change its description. Smart tags cannot be updated.",
  idempotent: true,
  params: [
    {
      key: "tagId",
      label: "Tag ID",
      type: "number",
      required: true,
      validation: { min: 1, integer: true },
    },
    { key: "name", label: "New name", type: "string" },
    { key: "text", label: "New description", type: "text" },
  ],
  output: [{ key: "success", type: "boolean", label: "Updated" }],

  async execute(input, ctx) {
    ctx.log("info", "tag-update");
    const body = compact({ name: input.name, text: input.text });
    if (Object.keys(body).length === 0) throw new Error("Give a new name or a new description");
    const res = await kt(ctx, "PUT", `/tag/${seg(input.tagId, "tagId")}`, { body });
    return { success: expectTrue(res, "tag update") };
  },
};

export default tagUpdate;
