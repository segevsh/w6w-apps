import type { ActionDefinition } from "@w6w/types";
import { NotionClient, resolveDataSource } from "../lib/client.ts";
import { buildPageBody, type PageContentInput, pageContentParams } from "../lib/pages.ts";

interface Input extends PageContentInput {
  databaseId?: string;
  dataSourceId?: string;
}
const action: ActionDefinition<Input> = {
  key: "create-database-page",
  type: "perform",
  resource: "databasePage",
  title: "Create Database Page",
  description:
    "Create a row in a data source. An existing Database ID works when the database contains exactly one data source.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
    { "key": "in_trash", "type": "boolean", "label": "In trash" },
    { "key": "is_archived", "type": "boolean", "label": "Is archived" },
    { "key": "is_locked", "type": "boolean", "label": "Is locked" },
    { "key": "url", "type": "string", "label": "Url" },
    { "key": "public_url", "type": "object", "label": "Public url" },
    { "key": "parent", "type": "object", "label": "Parent" },
    { "key": "properties", "type": "object", "label": "Properties" },
    { "key": "icon", "type": "object", "label": "Icon" },
    { "key": "cover", "type": "object", "label": "Cover" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "last_edited_by", "type": "object", "label": "Last edited by" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "status_url", "type": "string", "label": "Status url" },
    { "key": "poll_after_seconds", "type": "number", "label": "Poll after seconds" },
    { "key": "operation", "type": "object", "label": "Operation" },
  ],
  idempotent: false,
  params: [
    {
      key: "dataSourceId",
      label: "Data Source ID",
      type: "string",
      hint:
        "Find with Search Data Sources, or in Get Database → data_sources. Supply this or Database ID.",
    },
    {
      key: "databaseId",
      label: "Database ID",
      type: "string",
      hint:
        "Compatibility input: resolves the database's sole data source. For multiple data sources, supply Data Source ID explicitly.",
    },
    ...pageContentParams,
  ],
  async execute(input, ctx) {
    const body = buildPageBody(input);
    const client = new NotionClient(ctx);
    const dataSourceId = await resolveDataSource(client, input);
    body.parent = { data_source_id: dataSourceId };
    return client.request("/pages", {
      method: "POST",
      query: { filter_properties: input.filterProperties },
      body,
    });
  },
};
export default action;
