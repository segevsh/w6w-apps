import type { ActionDefinition } from "@w6w/types";
import { AnchorClient } from "../lib/client.ts";
import { limitParam, pageParam, searchParam } from "../lib/params.ts";

/** `GET /contacts` — Anchor operation `listContacts`. */
interface Input {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "Page through client contacts, optionally filtered by search text or accessibility.",
  params: [
    pageParam,
    limitParam,
    searchParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "accessible", label: "accessible" }, {
        value: "archived",
        label: "archived",
      }],
      hint: "accessible or archived.",
    },
  ],
  output: [
    { key: "entries", type: "array", label: "Items on this page" },
    { key: "page", type: "number", label: "Page" },
    { key: "limit", type: "number", label: "Page size" },
    { key: "totalCount", type: "number", label: "Total matching items" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", "/contacts", {
      query: { page: input.page, limit: input.limit, search: input.search, status: input.status },
    });
  },
};

export default contactList;
