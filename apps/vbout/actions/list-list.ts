import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/emailmarketing/getlists.json` — Return all email-marketing contact lists.
 */
type Input = Record<string, never>;

const listList: ActionDefinition<Input> = {
  key: "list-list",
  type: "read",
  resource: "list",
  title: "List Contact Lists",
  description: "Return all email-marketing contact lists.",
  params: [],
  output: [
    { key: "lists", type: "object", label: "Lists: { count, items[] }" },
  ],

  async execute(_input, ctx) {
    return await new VboutClient(ctx).get("emailmarketing/getlists");
  },
};

export default listList;
