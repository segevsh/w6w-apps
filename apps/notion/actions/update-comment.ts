import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  commentId: string;
  markdownVersion?: "v1" | "v2";
  richText?: unknown[];
  markdown?: string;
}

/** PATCH /v1/comments/{comment_id} — update-a-comment. */
const action: ActionDefinition<Input> = {
  key: "update-comment",
  type: "perform",
  resource: "comment",
  title: "Update Comment",
  description: "Update a comment.",
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
    "key": "commentId",
    "label": "Comment ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the comment to update.",
  }, {
    "key": "markdownVersion",
    "label": "Markdown Version",
    "type": "select",
    "options": [{ "value": "v1", "label": "v1" }, { "value": "v2", "label": "v2" }],
    "hint":
      "The Markdown syntax to use. `v1` (the default) is enhanced markdown. `v2` is [Notion-flavored Markdown](/guides/data-apis/notion-flavored-markdown), an opt-in preview.",
  }, {
    "key": "richText",
    "label": "Rich Text",
    "type": "json",
    "hint": "An array of rich text objects that represent the updated content of the comment.",
  }, {
    "key": "markdown",
    "label": "Markdown",
    "type": "string",
    "hint":
      "The updated content of the comment as a Markdown string. Comment Markdown supports inline formatting only (bold, italic, strikethrough, code, links), inline equations ($expression$), and mentions. Block-level Markdown such as fenced code blocks, headings, lists, tables, and blockquotes does not render as structured blocks in comments.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/comments/${pathId(input.commentId)}`, {
      method: "PATCH",
      body: {
        "markdown_version": input.markdownVersion,
        "rich_text": input.richText,
        "markdown": input.markdown,
      },
    });
  },
};

export default action;
