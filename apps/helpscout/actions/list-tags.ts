import type { ActionDefinition } from "@w6w/types";
import { HelpScoutClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  page?: number;
}

const listTags: ActionDefinition<Input> = {
  key: "list-tags",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List every tag used across all inboxes, alphabetically.",
  params: [...pagination],
  output: [{ key: "tags", type: "array", label: "Tags" }],

  async execute(input, ctx) {
    const body = await new HelpScoutClient(ctx).request<{ _embedded?: { tags?: unknown } }>(
      "/tags",
      { query: { page: input.page } },
    );
    return { tags: body._embedded?.tags ?? [] };
  },
};

export default listTags;
