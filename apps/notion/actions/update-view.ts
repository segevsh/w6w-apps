import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  viewId: string;
  name?: string;
  filter?: Record<string, unknown> | null;
  sorts?: unknown[] | null;
  quickFilters?: Record<string, unknown> | null;
  configuration?: Record<string, unknown>;
}

/** PATCH /v1/views/{view_id} — update-a-view. */
const action: ActionDefinition<Input> = {
  key: "update-view",
  type: "perform",
  resource: "view",
  title: "Update View",
  description: "Update a view.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "parent", "type": "object", "label": "Parent" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "name", "type": "string", "label": "Name" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
    { "key": "url", "type": "string", "label": "Url" },
    { "key": "data_source_id", "type": "object", "label": "Data source id" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "last_edited_by", "type": "object", "label": "Last edited by" },
    { "key": "filter", "type": "object", "label": "Filter" },
    { "key": "sorts", "type": "object", "label": "Sorts" },
    { "key": "quick_filters", "type": "object", "label": "Quick filters" },
    { "key": "configuration", "type": "object", "label": "Configuration" },
    { "key": "dashboard_view_id", "type": "string", "label": "Dashboard view id" },
  ],
  idempotent: false,
  params: [
    {
      "key": "viewId",
      "label": "View ID",
      "type": "string",
      "required": true,
      "hint": "ID of a Notion view.",
    },
    { "key": "name", "label": "Name", "type": "string", "hint": "New name for the view." },
    {
      "key": "filter",
      "label": "Filter",
      "type": "json",
      "hint":
        "Filter to apply to the view. Uses the same format as the data source query filter. Pass null to clear the filter.",
    },
    {
      "key": "sorts",
      "label": "Sorts",
      "type": "json",
      "hint":
        "Property sorts to apply to the view. Only property-based sorts are supported. Pass null to clear the sorts.",
    },
    {
      "key": "quickFilters",
      "label": "Quick Filters",
      "type": "json",
      "hint":
        "Quick filters for the view's filter bar. Keys are property names or IDs. Set a key to a filter condition to add/update that quick filter. Set a key to null to remove it. Pass null for the entire field to clear all quick filters. Unmentioned quick filters are preserved.",
    },
    {
      "key": "configuration",
      "label": "Configuration",
      "type": "json",
      "hint":
        "View presentation configuration. The type field must match the view type. Individual nullable fields within the configuration can be set to null to clear them.",
    },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/views/${pathId(input.viewId)}`, {
      method: "PATCH",
      body: {
        "name": input.name,
        "filter": input.filter,
        "sorts": input.sorts,
        "quick_filters": input.quickFilters,
        "configuration": input.configuration,
      },
    });
  },
};

export default action;
