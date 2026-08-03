import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient, type MailerLiteEnvelope } from "../lib/client.ts";

interface Input {
  keyword?: string;
  type?: "text" | "number" | "date";
  limit?: number;
  page?: number;
  sort?: string;
}

/**
 * `GET /api/fields` — the lookup that makes `upsert-subscriber` usable: the
 * `fields` object there is keyed by these fields' names, and MailerLite rejects
 * anything it does not recognise. An account can hold at most 100 fields.
 */
const listFields: ActionDefinition<Input> = {
  key: "list-fields",
  type: "read",
  resource: "field",
  title: "List Fields",
  description: "List the subscriber fields defined on the account, with their keys and types.",
  params: [
    {
      key: "keyword",
      label: "Keyword",
      type: "string",
      hint: "Partial match on the field name.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "text", label: "Text" },
        { value: "number", label: "Number" },
        { value: "date", label: "Date" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 25 },
    { key: "page", label: "Page", type: "number", default: 1 },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      hint: "Ascending by default; the `-` variants sort descending.",
      options: [
        { value: "name", label: "Name" },
        { value: "-name", label: "Name (desc)" },
        { value: "type", label: "Type" },
        { value: "-type", label: "Type (desc)" },
      ],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Fields" },
    { key: "links", type: "object", label: "Page links" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    return client.request<MailerLiteEnvelope<unknown[]>>("/fields", {
      query: {
        "filter[keyword]": input.keyword,
        "filter[type]": input.type,
        limit: input.limit ?? 25,
        page: input.page ?? 1,
        sort: input.sort,
      },
    });
  },
};

export default listFields;
