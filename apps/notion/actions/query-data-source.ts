import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  dataSourceId: string;
  filterProperties?: string[];
  sorts?: unknown[];
  filter?: unknown;
  startCursor?: string;
  pageSize?: number;
  isArchived?: boolean;
  resultType?: "page" | "data_source";
}

/** POST /v1/data_sources/{data_source_id}/query — post-database-query. */
const action: ActionDefinition<Input> = {
  key: "query-data-source",
  type: "read",
  resource: "dataSource",
  title: "Query Data Source",
  description: "Query a data source.",
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
      "key": "dataSourceId",
      "label": "Data Source ID",
      "type": "string",
      "required": true,
      "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
    },
    {
      "key": "filterProperties",
      "label": "Filter Properties",
      "type": "array",
      "item": { "type": "string" },
      "hint":
        "Property names or IDs to include in each page's `properties` object. Other properties are left out. Repeat the parameter to pass more than one value, for example `filter_properties=title&filter_properties=Status`. Pages that aren't in a data source always return only `title`.",
    },
    { "key": "sorts", "label": "Sorts", "type": "json" },
    { "key": "filter", "label": "Filter", "type": "json" },
    { "key": "startCursor", "label": "Start Cursor", "type": "string" },
    {
      "key": "pageSize",
      "label": "Page Size",
      "type": "number",
      "hint": "Number of results per page (1–100).",
      "validation": { "min": 1, "integer": true, "max": 100 },
    },
    {
      "key": "isArchived",
      "label": "Is Archived",
      "type": "boolean",
      "hint":
        "Whether to return archived pages. When omitted or false, returns non-archived pages. When true, returns archived pages.",
    },
    {
      "key": "resultType",
      "label": "Result Type",
      "type": "select",
      "options": [{ "value": "page", "label": "page" }, {
        "value": "data_source",
        "label": "data_source",
      }],
      "hint":
        "Optionally filter the results to only include pages or data sources. Regular, non-wiki databases only support page children. The default behavior is no result type filtering, in other words, returning both pages and data sources for wikis.",
    },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/data_sources/${pathId(input.dataSourceId)}/query`, {
      method: "POST",
      query: {
        "filter_properties": input.filterProperties,
      },
      body: {
        "sorts": input.sorts,
        "filter": input.filter,
        "start_cursor": input.startCursor,
        "page_size": input.pageSize,
        "is_archived": input.isArchived,
        "result_type": input.resultType,
      },
    });
  },
};

export default action;
