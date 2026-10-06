import type { ActionDefinition } from "@w6w/types";
import { LushaClient, seg } from "../lib/client.ts";

interface Input {
  filterType: string;
  query?: string;
}

const action: ActionDefinition<Input> = {
  key: "contact-filter-value-list",
  type: "read",
  resource: "contact",
  title: "List Contact Filter Values",
  description: "Valid values for one contact filter type, for building Prospect Contacts filters.",
  params: [
    {
      key: "filterType",
      label: "Filter type",
      type: "select",
      required: true,
      options: [
        { value: "departments", label: "departments" },
        { value: "seniority", label: "seniority" },
        { value: "existingDataPoints", label: "existingDataPoints" },
        { value: "countries", label: "countries" },
        { value: "locations", label: "locations" },
      ],
    },
    { key: "query", label: "Search text", type: "string", hint: "Required for `locations`." },
  ],
  output: [
    {
      key: "values",
      type: "array",
      label: "Valid filter values; shape depends on the filter type",
    },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request(
      "GET",
      `/v3/contacts/prospecting/filters/${seg(input.filterType)}`,
      { query: { query: input.query } },
    );
  },
};

export default action;
