import type { ActionDefinition } from "@w6w/types";
import { MandrillClient } from "../lib/client.ts";

// deno-lint-ignore no-empty-interface
interface Input {}

const listTags: ActionDefinition<Input> = {
  key: "list-tags",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description: "Return all user-defined tag information (POST /tags/list.json).",
  params: [],
  output: [{ key: "tags", type: "array", label: "Tags" }],

  execute(_input, ctx) {
    const client = new MandrillClient(ctx);
    return client.request("/tags/list.json", {});
  },
};

export default listTags;
