import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { buildSearch, type SearchInput, searchOutput, searchParams } from "../lib/params.ts";

/** Fields returned when the caller names none — all taken from the reference's own sample body. */
const DEFAULT_FIELDS = [
  "contact.id",
  "contact.name",
  "contact.firstName",
  "contact.lastName",
  "contact.email",
  "contact.mobile",
  "contact.designation",
  "contact.company.id",
  "contact.company.name",
  "contact.tags",
  "contact.billingCity",
  "contact.billingCountry",
  "contact.lastModifiedAt",
];

const contactSearch: ActionDefinition<SearchInput> = {
  key: "contact-search",
  type: "search",
  resource: "contact",
  title: "Search Contacts",
  description:
    "Search contacts with filter rules. With no rules it returns every contact, up to `rows` per request.",
  params: searchParams,
  output: searchOutput,

  async execute(input, ctx) {
    const data = await new SalesmateClient(ctx).request<
      { data?: unknown[]; totalRows?: number; totalPages?: number }
    >("/contact/v4/search", {
      method: "POST",
      query: { rows: input.rows, from: input.from },
      body: buildSearch("contact", DEFAULT_FIELDS, input),
    });
    return {
      records: data?.data ?? [],
      totalRows: data?.totalRows,
      totalPages: data?.totalPages,
    };
  },
};

export default contactSearch;
