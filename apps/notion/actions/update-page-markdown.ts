import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  pageId: string;
  allowAsync?: boolean;
  markdownVersion?: "v1" | "v2";
  type: string;
  insertContent?: Record<string, unknown>;
  replaceContentRange?: Record<string, unknown>;
  updateContent?: Record<string, unknown>;
  replaceContent?: Record<string, unknown>;
}

/** PATCH /v1/pages/{page_id}/markdown — update-page-markdown. */
const action: ActionDefinition<Input> = {
  key: "update-page-markdown",
  type: "perform",
  resource: "page",
  title: "Update Page Markdown",
  description: "Update a page's content as markdown.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "markdown", "type": "string", "label": "Markdown" },
    { "key": "truncated", "type": "boolean", "label": "Truncated" },
    { "key": "unknown_block_ids", "type": "array", "label": "Unknown block ids" },
    { "key": "warnings", "type": "array", "label": "Warnings" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "status_url", "type": "string", "label": "Status url" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "poll_after_seconds", "type": "number", "label": "Poll after seconds" },
    { "key": "operation", "type": "object", "label": "Operation" },
  ],
  idempotent: false,
  params: [
    {
      "key": "pageId",
      "label": "Page ID",
      "type": "string",
      "required": true,
      "hint": "The ID of the page to update.",
    },
    {
      "key": "allowAsync",
      "label": "Allow Async",
      "type": "boolean",
      "hint":
        "Set to true to opt into receiving an async_task result when this update operation is accepted for background execution. If omitted or false, the endpoint keeps the existing synchronous response shape.",
    },
    {
      "key": "markdownVersion",
      "label": "Markdown Version",
      "type": "select",
      "options": [{ "value": "v1", "label": "v1" }, { "value": "v2", "label": "v2" }],
      "hint":
        "The Markdown syntax to use. `v1` (the default) is enhanced markdown. `v2` is [Notion-flavored Markdown](/guides/data-apis/notion-flavored-markdown), an opt-in preview.",
    },
    { "key": "type", "label": "Type", "type": "string", "required": true },
    {
      "key": "insertContent",
      "label": "Insert Content",
      "type": "json",
      "hint": "Insert new content into the page.",
    },
    {
      "key": "replaceContentRange",
      "label": "Replace Content Range",
      "type": "json",
      "hint": "Replace a range of content in the page.",
    },
    {
      "key": "updateContent",
      "label": "Update Content",
      "type": "json",
      "hint": "Update specific content using search-and-replace operations.",
    },
    {
      "key": "replaceContent",
      "label": "Replace Content",
      "type": "json",
      "hint": "Replace the entire page content with new markdown.",
    },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/pages/${pathId(input.pageId)}/markdown`, {
      method: "PATCH",
      body: {
        "allow_async": input.allowAsync,
        "markdown_version": input.markdownVersion,
        "type": input.type,
        "insert_content": input.insertContent,
        "replace_content_range": input.replaceContentRange,
        "update_content": input.updateContent,
        "replace_content": input.replaceContent,
      },
    });
  },
};

export default action;
