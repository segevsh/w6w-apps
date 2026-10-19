import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  attachments?: unknown[];
  displayName?: Record<string, unknown>;
  markdownVersion?: "v1" | "v2";
  parent?: Record<string, unknown>;
  richText?: unknown[];
  markdown?: string;
  discussionId?: string;
}

/** POST /v1/comments — create-a-comment. */
const action: ActionDefinition<Input> = {
  key: "create-comment",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Create a comment.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "parent", "type": "object", "label": "Parent" },
    { "key": "discussion_id", "type": "string", "label": "Discussion id" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "rich_text", "type": "array", "label": "Rich text" },
    { "key": "display_name", "type": "object", "label": "Display name" },
    { "key": "original_content_deleted", "type": "boolean", "label": "Original content deleted" },
    { "key": "has_pending_attachments", "type": "boolean", "label": "Has pending attachments" },
    { "key": "attachments", "type": "array", "label": "Attachments" },
  ],
  idempotent: false,
  params: [{
    "key": "attachments",
    "label": "Attachments",
    "type": "json",
    "hint": "An array of files to attach to the comment. Maximum of 3 allowed.",
  }, {
    "key": "displayName",
    "label": "Display Name",
    "type": "json",
    "hint": "Display name for the comment.",
  }, {
    "key": "markdownVersion",
    "label": "Markdown Version",
    "type": "select",
    "options": [{ "value": "v1", "label": "v1" }, { "value": "v2", "label": "v2" }],
    "hint":
      "The Markdown syntax to use. `v1` (the default) is enhanced markdown. `v2` is [Notion-flavored Markdown](/guides/data-apis/notion-flavored-markdown), an opt-in preview.",
  }, {
    "key": "parent",
    "label": "Parent",
    "type": "json",
    "hint": "The parent of the comment. This can be a page or a block.",
  }, {
    "key": "richText",
    "label": "Rich Text",
    "type": "json",
    "hint": "An array of rich text objects that represent the content of the comment.",
  }, {
    "key": "markdown",
    "label": "Markdown",
    "type": "string",
    "hint":
      "The content of the comment as a Markdown string. Comment Markdown supports inline formatting only (bold, italic, strikethrough, code, links), inline equations ($expression$), and mentions. Block-level Markdown such as fenced code blocks, headings, lists, tables, and blockquotes does not render as structured blocks in comments.",
  }, {
    "key": "discussionId",
    "label": "Discussion ID",
    "type": "string",
    "hint": "The ID of the discussion to comment on.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/comments`, {
      method: "POST",
      body: {
        "attachments": input.attachments,
        "display_name": input.displayName,
        "markdown_version": input.markdownVersion,
        "parent": input.parent,
        "rich_text": input.richText,
        "markdown": input.markdown,
        "discussion_id": input.discussionId,
      },
    });
  },
};

export default action;
