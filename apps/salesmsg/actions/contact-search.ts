import type { ActionDefinition } from "@w6w/types";
import { SalesmsgClient } from "../lib/client.ts";

/**
 * `GET /contacts/search` (scope `contacts:read`). Answers `{results: [...]}`, normalised to
 * `items`.
 */
interface Input {
  term: string;
  limit?: number;
}

const contactSearch: ActionDefinition<Input> = {
  key: "contact-search",
  type: "search",
  resource: "contact",
  title: "Search Contacts",
  description: "Search contacts by a term.",
  params: [
    {
      key: "term",
      label: "Search term",
      type: "string",
      required: true,
      hint: "The string to search for.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Maximum results (the vendor's default is 50).",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "items", type: "array", label: "Rows" },
    { key: "meta", type: "object", label: "Pagination block, when the vendor sends one" },
  ],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).items("/contacts/search", {
      query: {
        term: input.term,
        limit: input.limit,
      },
    });
  },
};

export default contactSearch;
