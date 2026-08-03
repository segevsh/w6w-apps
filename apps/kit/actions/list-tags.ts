import type { ActionDefinition } from "@w6w/types";
import {
  KitClient,
  type KitList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  include?: string;
}

const listTags: ActionDefinition<Input> = {
  key: "list-tags",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description: "List the account's tags, one cursor page at a time.",
  params: [
    {
      key: "include",
      label: "Include",
      type: "string",
      hint: "Comma-separated extra fields. Only `subscriber_count` is supported.",
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "tags", type: "array", label: "Tags" },
    ...PAGE_OUTPUT,
  ],

  execute(input, ctx) {
    return new KitClient(ctx).request<KitList<"tags">>("/tags", {
      query: { ...pageQuery(input), include: input.include },
    });
  },
};

export default listTags;
