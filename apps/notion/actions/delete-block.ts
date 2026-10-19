import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  blockId: string;
}

/** DELETE /v1/blocks/{block_id} — delete-a-block. */
const action: ActionDefinition<Input> = {
  key: "delete-block",
  type: "perform",
  resource: "block",
  title: "Delete Block",
  description: "Delete a block.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "paragraph", "type": "object", "label": "Paragraph" },
    { "key": "parent", "type": "object", "label": "Parent" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
    { "key": "last_edited_by", "type": "object", "label": "Last edited by" },
    { "key": "has_children", "type": "boolean", "label": "Has children" },
    { "key": "in_trash", "type": "boolean", "label": "In trash" },
    { "key": "heading_1", "type": "object", "label": "Heading 1" },
    { "key": "heading_2", "type": "object", "label": "Heading 2" },
    { "key": "heading_3", "type": "object", "label": "Heading 3" },
    { "key": "heading_4", "type": "object", "label": "Heading 4" },
    { "key": "bulleted_list_item", "type": "object", "label": "Bulleted list item" },
    { "key": "numbered_list_item", "type": "object", "label": "Numbered list item" },
    { "key": "quote", "type": "object", "label": "Quote" },
    { "key": "to_do", "type": "object", "label": "To do" },
    { "key": "toggle", "type": "object", "label": "Toggle" },
    { "key": "template", "type": "object", "label": "Template" },
    { "key": "synced_block", "type": "object", "label": "Synced block" },
    { "key": "child_page", "type": "object", "label": "Child page" },
    { "key": "child_database", "type": "object", "label": "Child database" },
    { "key": "equation", "type": "object", "label": "Equation" },
    { "key": "code", "type": "object", "label": "Code" },
    { "key": "callout", "type": "object", "label": "Callout" },
    { "key": "divider", "type": "object", "label": "Divider" },
    { "key": "breadcrumb", "type": "object", "label": "Breadcrumb" },
    { "key": "table_of_contents", "type": "object", "label": "Table of contents" },
    { "key": "tab", "type": "object", "label": "Tab" },
    { "key": "column_list", "type": "object", "label": "Column list" },
    { "key": "column", "type": "object", "label": "Column" },
    { "key": "link_to_page", "type": "object", "label": "Link to page" },
    { "key": "table", "type": "object", "label": "Table" },
    { "key": "table_row", "type": "object", "label": "Table row" },
    { "key": "meeting_notes", "type": "object", "label": "Meeting notes" },
    { "key": "embed", "type": "object", "label": "Embed" },
    { "key": "bookmark", "type": "object", "label": "Bookmark" },
    { "key": "image", "type": "object", "label": "Image" },
    { "key": "video", "type": "object", "label": "Video" },
    { "key": "pdf", "type": "object", "label": "Pdf" },
    { "key": "file", "type": "object", "label": "File" },
    { "key": "audio", "type": "object", "label": "Audio" },
    { "key": "link_preview", "type": "object", "label": "Link preview" },
    { "key": "unsupported", "type": "object", "label": "Unsupported" },
  ],
  idempotent: false,
  params: [{
    "key": "blockId",
    "label": "Block ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/blocks/${pathId(input.blockId)}`, {
      method: "DELETE",
    });
  },
};

export default action;
