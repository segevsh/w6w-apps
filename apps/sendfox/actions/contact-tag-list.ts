import type { ActionDefinition } from "@w6w/types";
import { SendfoxClient } from "../lib/client.ts";

/**
 * `GET /contact-tags` — the account's tags.
 *
 * "Newest first, each with its contact count", per the document. The endpoint is
 * the account's *contact* tags; SendFox also has legacy `/tags` endpoints that
 * operate on lists, which this app does not call and this action is not.
 *
 * The document declares no query parameters and no `per_page`, so the action
 * exposes none — there is nothing to page with.
 */
type Input = Record<string, never>;

const contactTagList: ActionDefinition<Input> = {
  key: "contact-tag-list",
  type: "search",
  resource: "contact-tag",
  title: "List Contact Tags",
  description: "List the account's contact tags, newest first, with each tag's contact count.",
  output: [
    { key: "data", type: "array", label: "Tags" },
    { key: "current_page", type: "number", label: "Page number" },
    { key: "total", type: "number", label: "Total tags" },
    { key: "per_page", type: "number", label: "Tags per page" },
  ],

  execute(_input, ctx) {
    return new SendfoxClient(ctx).json("/contact-tags");
  },
};

export default contactTagList;
