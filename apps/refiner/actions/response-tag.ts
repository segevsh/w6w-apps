import type { ActionDefinition } from "@w6w/types";
import { RefinerClient, toList } from "../lib/client.ts";

interface Input {
  uuid: string;
  tags: string[] | string;
}

const responseTag: ActionDefinition<Input> = {
  key: "response-tag",
  type: "perform",
  resource: "response",
  title: "Tag Response",
  description: "Add tags to an existing survey response.",
  idempotent: true,
  params: [
    {
      key: "uuid",
      label: "Response UUID",
      type: "string",
      required: true,
      hint: "The `uuid` of a response from List Responses or Store Response.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      required: true,
      hint: "Comma-separated, at most 20.",
    },
  ],
  output: [{ key: "message", type: "string", label: "`ok` on success" }],

  async execute(input, ctx) {
    const tags = toList(input.tags);
    if (!tags) throw new Error("provide at least one tag");
    if (tags.length > 20) throw new Error("at most 20 tags are allowed");
    return await new RefinerClient(ctx).json("/responses/tags", {
      method: "POST",
      body: { uuid: input.uuid, tags },
    });
  },
};

export default responseTag;
