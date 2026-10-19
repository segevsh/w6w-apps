import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  filterProperties?: string[];
  sort?: Record<string, unknown>;
  query?: string;
  startCursor?: string;
  pageSize?: number;
  filter?: Record<string, unknown>;
}

/** POST /v1/search — post-search. */
const action: ActionDefinition<Input> = {
  key: "search-data-sources",
  type: "search",
  resource: "search",
  title: "Search Data Sources",
  description: "Search by title.",
  output: [
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "page_or_data_source", "type": "object", "label": "Page or data source" },
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "next_cursor", "type": "string", "label": "Next cursor" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "request_status", "type": "object", "label": "Request status" },
  ],
  params: [
    {
      "key": "filterProperties",
      "label": "Filter Properties",
      "type": "array",
      "item": { "type": "string" },
      "hint":
        "Property names or IDs to include in each page's `properties` object. Other properties are left out. Repeat the parameter to pass more than one value, for example `filter_properties=title&filter_properties=Status`. Pages that aren't in a data source always return only `title`. Search skips names or IDs that don't exist on a page.",
    },
    { "key": "sort", "label": "Sort", "type": "json" },
    { "key": "query", "label": "Query", "type": "string" },
    { "key": "startCursor", "label": "Start Cursor", "type": "string" },
    {
      "key": "pageSize",
      "label": "Page Size",
      "type": "number",
      "hint": "Number of results per page (1\u2013100).",
      "validation": { "min": 1, "max": 100 },
    },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/search`, {
      method: "POST",
      query: {
        "filter_properties": input.filterProperties,
      },
      body: {
        "sort": input.sort,
        "query": input.query,
        "start_cursor": input.startCursor,
        "page_size": input.pageSize,
        "filter": { property: "object", value: "data_source" },
      },
    });
  },
};

export default action;
