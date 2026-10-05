import type { ActionDefinition } from "@w6w/types";
import { compact, SalesmsgClient } from "../lib/client.ts";

/**
 * `POST /contacts/list` — "Get list of contacts". It is a POST because the filter travels in a
 * JSON body, but it only reads. The older `GET /contacts` is marked deprecated in the document, so
 * this is the list endpoint. The document tags it with scope `contacts:write` (not
 * `contacts:read`), which matters for an OAuth token and not for a Personal Access Token. Answers
 * `{data, meta}`.
 */
interface Input {
  search?: string;
  page?: number;
  length?: number;
  sortBy?: string;
  sortOrder?: string;
  useShortResponse?: boolean;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts, optionally filtered by a search term.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Match against name, email and number.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Page number.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "length",
      label: "Page size",
      type: "number",
      hint: "Rows per page.",
      validation: { integer: true, min: 1, max: 100 },
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      hint: "Field to sort by.",
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
    {
      key: "useShortResponse",
      label: "Short response",
      type: "boolean",
      hint: "Ask the API for the reduced contact shape.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Rows" },
    { key: "meta", type: "object", label: "Pagination block, when the vendor sends one" },
  ],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).items("/contacts/list", {
      method: "POST",
      body: compact({
        search: input.search,
        page: input.page,
        length: input.length,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
        useShortResponse: input.useShortResponse,
      }),
    });
  },
};

export default contactList;
