import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";
import {
  buildPageBody,
  type PageContentInput,
  pageContentParams,
  pageIdFromUrl,
} from "../lib/pages.ts";

interface Input extends PageContentInput {
  parentType?: "workspace" | "page" | "data_source" | "custom";
  parentPageId?: string;
  dataSourceId?: string;
  parent?: Record<string, unknown>;
  title?: string;
}

const createPage: ActionDefinition<Input> = {
  key: "create-page",
  type: "perform",
  resource: "page",
  title: "Create Page",
  description:
    "Create a page in the workspace, under a page, or in a data source. Workspace pages require OAuth or a personal access token; internal integrations need a parent.",
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
      key: "parentType",
      label: "Create in",
      type: "select",
      options: [
        { value: "workspace", label: "Workspace (private page)" },
        { value: "page", label: "Existing page" },
        { value: "data_source", label: "Data source (database row)" },
        { value: "custom", label: "Parent object (advanced)" },
      ],
      hint:
        "Leave blank for a private workspace page. Internal integrations must choose an existing page or data source shared with the integration.",
    },
    {
      key: "parentPageId",
      label: "Parent page ID or URL",
      type: "string",
      hint:
        "Open the destination page in Notion and copy its link, or use Search Pages to find its ID. Connect the integration to that page first. Required when Create in is Existing page.",
    },
    {
      key: "dataSourceId",
      label: "Data Source ID",
      type: "string",
      hint:
        "Use Search Data Sources or Get Database → data_sources to find this ID. Required when Create in is Data source.",
      showIf: { "==": [{ var: "parentType" }, "data_source"] },
    },
    {
      key: "parent",
      label: "Parent object",
      type: "json",
      advanced: true,
      hint:
        'Notion parent object, for example {"page_id":"…"}, {"data_source_id":"…"}, or {"workspace":true}. Do not combine with the parent ID fields.',
      showIf: { "==": [{ var: "parentType" }, "custom"] },
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      hint:
        "Optional page title. For a data source, supply its title property by name in Properties instead.",
    },
    ...pageContentParams,
  ],
  execute(input, ctx) {
    const parents = [input.parentPageId, input.dataSourceId, input.parent].filter(Boolean);
    if (parents.length > 1) {
      throw new Error("Choose only one parent: page, data source, or parent object.");
    }
    const mode = input.parentType ??
      (input.parentPageId
        ? "page"
        : input.dataSourceId
        ? "data_source"
        : input.parent
        ? "custom"
        : "workspace");
    let parent: Record<string, unknown> | undefined;
    if (mode === "page") {
      if (!input.parentPageId) {
        throw new Error(
          "Provide a parent page ID or paste its Notion URL. Use Search Pages to find a shared page.",
        );
      }
      parent = { page_id: pageIdFromUrl(input.parentPageId) };
    } else if (mode === "data_source") {
      if (!input.dataSourceId) {
        throw new Error("Provide a Data Source ID from Search Data Sources or Get Database.");
      }
      parent = { data_source_id: input.dataSourceId };
    } else if (mode === "custom") {
      if (!input.parent) throw new Error("Provide a Notion parent object.");
      parent = input.parent;
    } else if (parents.length) {
      throw new Error(
        "Workspace pages do not take a parent ID. Choose Existing page or Data source instead.",
      );
    }
    const body = buildPageBody(input);
    if (parent) body.parent = parent;
    if (input.title !== undefined) {
      if (parent?.data_source_id || parent?.database_id) {
        throw new Error(
          "For a database row, set the title in Properties using the data source's title property name.",
        );
      }
      if (input.properties?.title !== undefined) {
        throw new Error("Provide Title or properties.title, not both.");
      }
      body.properties = {
        ...input.properties,
        title: { title: [{ text: { content: input.title } }] },
      };
    }
    return new NotionClient(ctx).request("/pages", {
      method: "POST",
      query: { filter_properties: input.filterProperties },
      body,
    });
  },
};
export default createPage;
