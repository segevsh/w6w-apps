import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient, type MailerLiteEnvelope } from "../lib/client.ts";

interface Input {
  name?: string;
  limit?: number;
  page?: number;
  sort?: string;
}

/**
 * `GET /api/groups` — PAGE paginated (unlike subscribers, which are cursor
 * paginated). An account can hold at most 1000 groups.
 */
const listGroups: ActionDefinition<Input> = {
  key: "list-groups",
  type: "read",
  resource: "group",
  title: "List Groups",
  description: "List groups with their subscriber counts and engagement stats.",
  params: [
    {
      key: "name",
      label: "Name contains",
      type: "string",
      hint: "Partial match on the group name.",
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
        { value: "total", label: "Total subscribers" },
        { value: "-total", label: "Total subscribers (desc)" },
        { value: "open_rate", label: "Open rate" },
        { value: "-open_rate", label: "Open rate (desc)" },
        { value: "click_rate", label: "Click rate" },
        { value: "-click_rate", label: "Click rate (desc)" },
        { value: "created_at", label: "Created" },
        { value: "-created_at", label: "Created (desc)" },
      ],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Groups" },
    { key: "links", type: "object", label: "Page links" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    return client.request<MailerLiteEnvelope<unknown[]>>("/groups", {
      query: {
        "filter[name]": input.name,
        limit: input.limit ?? 25,
        page: input.page ?? 1,
        sort: input.sort,
      },
    });
  },
};

export default listGroups;
