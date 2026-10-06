import type { ActionDefinition } from "@w6w/types";
import { LushaClient, seg } from "../lib/client.ts";

interface Input {
  filterType: string;
  query?: string;
}

const action: ActionDefinition<Input> = {
  key: "company-filter-value-list",
  type: "read",
  resource: "company",
  title: "List Company Filter Values",
  description: "Valid values for one company filter type, for building Prospect Companies filters.",
  params: [
    {
      key: "filterType",
      label: "Filter type",
      type: "select",
      required: true,
      options: [
        { value: "names", label: "names" },
        { value: "sizes", label: "sizes" },
        { value: "revenues", label: "revenues" },
        { value: "locations", label: "locations" },
        { value: "sics", label: "sics" },
        { value: "naics", label: "naics" },
        { value: "industriesLabels", label: "industriesLabels" },
        { value: "intentTopics", label: "intentTopics" },
        { value: "technologies", label: "technologies" },
      ],
    },
    {
      key: "query",
      label: "Search text",
      type: "string",
      hint: "Required for names, locations and technologies.",
    },
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
      `/v3/companies/prospecting/filters/${seg(input.filterType)}`,
      { query: { query: input.query } },
    );
  },
};

export default action;
