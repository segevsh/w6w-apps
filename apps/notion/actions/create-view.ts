import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  dataSourceId: string;
  name: string;
  type:
    | "table"
    | "board"
    | "list"
    | "calendar"
    | "timeline"
    | "gallery"
    | "form"
    | "chart"
    | "map"
    | "dashboard";
  databaseId?: string;
  viewId?: string;
  filter?: Record<string, unknown>;
  sorts?: unknown[];
  quickFilters?: Record<string, unknown>;
  createDatabase?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  position?: Record<string, unknown>;
  placement?: Record<string, unknown>;
}

/** POST /v1/views — create-view. */
const action: ActionDefinition<Input> = {
  key: "create-view",
  type: "perform",
  resource: "view",
  title: "Create View",
  description: "Create a view.",
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
  params: [{
    "key": "dataSourceId",
    "label": "Data Source ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the data source this view should be scoped to.",
  }, {
    "key": "name",
    "label": "Name",
    "type": "string",
    "required": true,
    "hint": "The name of the view.",
  }, {
    "key": "type",
    "label": "Type",
    "type": "select",
    "required": true,
    "options": [
      { "value": "table", "label": "table" },
      { "value": "board", "label": "board" },
      { "value": "list", "label": "list" },
      { "value": "calendar", "label": "calendar" },
      { "value": "timeline", "label": "timeline" },
      { "value": "gallery", "label": "gallery" },
      { "value": "form", "label": "form" },
      { "value": "chart", "label": "chart" },
      { "value": "map", "label": "map" },
      { "value": "dashboard", "label": "dashboard" },
    ],
    "hint": "The type of view to create.",
  }, {
    "key": "databaseId",
    "label": "Database ID",
    "type": "string",
    "hint":
      "The ID of the database to create a view in. Mutually exclusive with view_id and create_database.",
  }, {
    "key": "viewId",
    "label": "View ID",
    "type": "string",
    "hint":
      "The ID of a dashboard view to add this view to as a widget. Mutually exclusive with database_id and create_database.",
  }, {
    "key": "filter",
    "label": "Filter",
    "type": "json",
    "hint": "Filter to apply to the view. Uses the same format as the data source query filter.",
  }, {
    "key": "sorts",
    "label": "Sorts",
    "type": "json",
    "hint": "Sorts to apply to the view. Uses the same format as the data source query sorts.",
  }, {
    "key": "quickFilters",
    "label": "Quick Filters",
    "type": "json",
    "hint":
      "Quick filters to pin in the view's filter bar. Keys are property names or IDs. Values are filter conditions (same shape as a property filter but without the property field). Each quick filter appears as a clickable pill above the view, independent of the advanced filter.",
  }, {
    "key": "createDatabase",
    "label": "Create Database",
    "type": "json",
    "hint":
      "Create a new linked database block on a page and add the view to it. Mutually exclusive with database_id and view_id.",
  }, {
    "key": "configuration",
    "label": "Configuration",
    "type": "json",
    "hint": "View presentation configuration. The type field must match the view type.",
  }, {
    "key": "position",
    "label": "Position",
    "type": "json",
    "hint":
      'Where to place the new view in the database\'s view tab bar. Only applicable when database_id is provided. Defaults to "end" (append).',
  }, {
    "key": "placement",
    "label": "Placement",
    "type": "json",
    "hint":
      "Where to place the new widget in a dashboard view. Only applicable when view_id is provided. Defaults to creating a new row at the end.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/views`, {
      method: "POST",
      body: {
        "data_source_id": input.dataSourceId,
        "name": input.name,
        "type": input.type,
        "database_id": input.databaseId,
        "view_id": input.viewId,
        "filter": input.filter,
        "sorts": input.sorts,
        "quick_filters": input.quickFilters,
        "create_database": input.createDatabase,
        "configuration": input.configuration,
        "position": input.position,
        "placement": input.placement,
      },
    });
  },
};

export default action;
