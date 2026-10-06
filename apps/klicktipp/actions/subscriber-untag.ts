import type { ActionDefinition } from "@w6w/types";
import { expectTrue, kt } from "../lib/client.ts";

interface Input {
  email: string;
  tagId: number;
}

/** Remove a manual tag from a contact. */
const subscriberUntag: ActionDefinition<Input> = {
  key: "subscriber-untag",
  type: "perform",
  resource: "subscriber",
  title: "Untag Contact",
  description: "Remove a manual tag from a contact.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "tagId",
      label: "Tag ID",
      type: "number",
      required: true,
      validation: { min: 1, integer: true },
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Untagged" }],

  async execute(input, ctx) {
    ctx.log("info", "subscriber-untag");
    const res = await kt(ctx, "POST", "/subscriber/untag", {
      body: { email: input.email, tagid: Number(input.tagId) },
    });
    return { success: expectTrue(res, "untag") };
  },
};

export default subscriberUntag;
