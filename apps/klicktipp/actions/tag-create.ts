import type { ActionDefinition } from "@w6w/types";
import { compact, expectId, kt } from "../lib/client.ts";

interface Input {
  name: string;
  text?: string;
}

/** Create a manual tag. */
const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a manual tag.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "text", label: "Description", type: "text" },
  ],
  output: [{ key: "tagId", type: "number", label: "New tag ID" }],

  async execute(input, ctx) {
    ctx.log("info", "tag-create");
    const res = await kt(ctx, "POST", "/tag", {
      body: compact({ name: input.name, text: input.text }),
    });
    return { tagId: expectId(res, "tag create") };
  },
};

export default tagCreate;
