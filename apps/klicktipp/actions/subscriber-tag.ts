import type { ActionDefinition } from "@w6w/types";
import { expectTrue, idList, kt } from "../lib/client.ts";

interface Input {
  email: string;
  tagIds: string;
}

/** Add one or more manual tags to a contact, which can start automations. */
const subscriberTag: ActionDefinition<Input> = {
  key: "subscriber-tag",
  type: "perform",
  resource: "subscriber",
  title: "Tag Contact",
  description: "Add one or more manual tags to a contact, which can start automations.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "tagIds",
      label: "Tag IDs",
      type: "string",
      required: true,
      placeholder: "19,20",
      hint:
        "Comma-separated manual tag IDs, from List Tags. Smart tags cannot be assigned (error 31).",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Tagged" }],

  async execute(input, ctx) {
    ctx.log("info", "subscriber-tag");
    const tagids = idList(input.tagIds, "tagIds", 100);
    const res = await kt(ctx, "POST", "/subscriber/tag", { body: { email: input.email, tagids } });
    return { success: expectTrue(res, "tag") };
  },
};

export default subscriberTag;
