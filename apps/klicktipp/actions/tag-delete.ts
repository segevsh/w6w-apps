import type { ActionDefinition } from "@w6w/types";
import { expectTrue, kt, seg } from "../lib/client.ts";

interface Input {
  tagId: number;
}

/** Delete a manual tag and remove it from every contact. Smart tags cannot be deleted. */
const tagDelete: ActionDefinition<Input> = {
  key: "tag-delete",
  type: "perform",
  resource: "tag",
  title: "Delete Tag",
  description:
    "Delete a manual tag and remove it from every contact. Smart tags cannot be deleted.",
  idempotent: true,
  params: [
    {
      key: "tagId",
      label: "Tag ID",
      type: "number",
      required: true,
      validation: { min: 1, integer: true },
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    ctx.log("info", "tag-delete");
    const res = await kt(ctx, "DELETE", `/tag/${seg(input.tagId, "tagId")}`);
    return { success: expectTrue(res, "tag delete") };
  },
};

export default tagDelete;
