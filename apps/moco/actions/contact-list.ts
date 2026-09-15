import type { ActionDefinition } from "@w6w/types";
import { MocoClient } from "../lib/client.ts";
import { pagination, parseList, updatedAfter } from "../lib/params.ts";

interface Input {
  page?: number;
  perPage?: number;
  updatedAfter?: string;
  ids?: string;
  tags?: string[] | string;
  term?: string;
  phone?: string;
}

/**
 * `GET /contacts/people` — verified against `docs.mocoapp.com/api/docs/v1.yaml`. The list
 * response omits the `info` field (MOCO's own documented behavior); use "Get Contact" for the
 * full record.
 */
const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contact people. Use the filters to narrow the set.",
  params: [
    {
      key: "term",
      label: "Search term",
      type: "string",
      hint: "Full-text on name, email, company.",
    },
    { key: "phone", label: "Phone", type: "string", hint: "Reverse lookup on work/mobile phone." },
    {
      key: "ids",
      label: "IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated contact IDs.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      advanced: true,
      hint: "Comma-separated list of tag names.",
    },
    updatedAfter,
    ...pagination,
  ],
  output: [
    { key: "contacts", type: "array", label: "Contacts" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Entries per page" },
    { key: "total", type: "number", label: "Total records" },
  ],

  async execute(input, ctx) {
    const { items, page } = await new MocoClient(ctx).list("/contacts/people", {
      query: {
        page: input.page,
        per_page: input.perPage,
        updated_after: input.updatedAfter,
        ids: input.ids,
        tags: parseList(input.tags)?.join(","),
        term: input.term,
        phone: input.phone,
      },
    });
    return { contacts: items, page: page.page, perPage: page.perPage, total: page.total };
  },
};

export default contactList;
