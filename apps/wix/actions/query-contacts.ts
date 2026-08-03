import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  OFFSET_PAGE_PARAMS,
  type OffsetPageInput,
  offsetPaging,
  PAGING_OUTPUT,
  WixClient,
} from "../lib/client.ts";

interface Input extends OffsetPageInput {
  filter?: Record<string, unknown>;
  search?: string;
  sortFieldName?: string;
  sortOrder?: "ASC" | "DESC";
  fields?: string;
  fieldsets?: string;
}

/** `POST /contacts/v4/contacts/query` — handler `wix.contacts.v4.contact:QueryContacts`. */
const queryContacts: ActionDefinition<Input> = {
  key: "query-contacts",
  type: "search",
  resource: "contact",
  title: "Query Contacts",
  description:
    "Find contacts by filter, plain-text search, sort and paging. Up to 1,000 per request; Wix defaults to 50.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint:
        'Wix API Query Language, e.g. `{"info.emails.email": "a@example.com"}` or `{"info.labelKeys": {"$hasSome": ["custom.vip"]}}`.',
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint:
        "Plain-text exact match across first name, last name, email and phone. Max 100 characters.",
    },
    {
      key: "sortFieldName",
      label: "Sort field",
      type: "string",
      hint: "e.g. `createdDate`, `info.name.last`, `primaryInfo.email`.",
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
    { key: "fields", label: "Fields", type: "string", hint: "Comma-separated field projection." },
    {
      key: "fieldsets",
      label: "Fieldsets",
      type: "string",
      hint: "Comma-separated presets: `BASIC`, `COMMUNICATION_DETAILS`, `EXTENDED`, `FULL`.",
    },
    ...OFFSET_PAGE_PARAMS,
  ],
  output: [
    { key: "contacts", type: "array", label: "Contacts" },
    ...PAGING_OUTPUT,
  ],

  execute(input, ctx) {
    const split = (v?: string) => v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    const sort = input.sortFieldName
      ? [{ fieldName: input.sortFieldName, order: input.sortOrder ?? "ASC" }]
      : undefined;

    return new WixClient(ctx).request("/contacts/v4/contacts/query", {
      method: "POST",
      body: compact({
        query: compact({
          filter: input.filter,
          sort,
          paging: offsetPaging(input),
          fields: split(input.fields),
          fieldsets: split(input.fieldsets),
        }),
        search: input.search,
      }),
    });
  },
};

export default queryContacts;
