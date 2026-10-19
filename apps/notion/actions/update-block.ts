import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  blockId: string;
  embed?: Record<string, unknown>;
  type?: string;
  inTrash?: boolean;
  bookmark?: Record<string, unknown>;
  image?: Record<string, unknown>;
  video?: Record<string, unknown>;
  pdf?: Record<string, unknown>;
  file?: Record<string, unknown>;
  audio?: Record<string, unknown>;
  code?: Record<string, unknown>;
  equation?: Record<string, unknown>;
  divider?: Record<string, unknown>;
  breadcrumb?: Record<string, unknown>;
  tab?: Record<string, unknown>;
  tableOfContents?: Record<string, unknown>;
  linkToPage?: Record<string, unknown>;
  tableRow?: Record<string, unknown>;
  heading_1?: Record<string, unknown>;
  heading_2?: Record<string, unknown>;
  heading_3?: Record<string, unknown>;
  heading_4?: Record<string, unknown>;
  paragraph?: Record<string, unknown>;
  bulletedListItem?: Record<string, unknown>;
  numberedListItem?: Record<string, unknown>;
  quote?: Record<string, unknown>;
  toDo?: Record<string, unknown>;
  toggle?: Record<string, unknown>;
  template?: Record<string, unknown>;
  callout?: Record<string, unknown>;
  syncedBlock?: Record<string, unknown>;
  table?: Record<string, unknown>;
  column?: Record<string, unknown>;
}

/** PATCH /v1/blocks/{block_id} — update-a-block. */
const action: ActionDefinition<Input> = {
  key: "update-block",
  type: "perform",
  resource: "block",
  title: "Update Block",
  description: "Update a block.",
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
  params: [
    {
      "key": "blockId",
      "label": "Block ID",
      "type": "string",
      "required": true,
      "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
    },
    { "key": "embed", "label": "Embed", "type": "json" },
    { "key": "type", "label": "Type", "type": "string" },
    { "key": "inTrash", "label": "In Trash", "type": "boolean" },
    { "key": "bookmark", "label": "Bookmark", "type": "json" },
    { "key": "image", "label": "Image", "type": "json" },
    { "key": "video", "label": "Video", "type": "json" },
    { "key": "pdf", "label": "Pdf", "type": "json" },
    { "key": "file", "label": "File", "type": "json" },
    { "key": "audio", "label": "Audio", "type": "json" },
    { "key": "code", "label": "Code", "type": "secret" },
    { "key": "equation", "label": "Equation", "type": "json" },
    { "key": "divider", "label": "Divider", "type": "json" },
    { "key": "breadcrumb", "label": "Breadcrumb", "type": "json" },
    { "key": "tab", "label": "Tab", "type": "json" },
    { "key": "tableOfContents", "label": "Table Of Contents", "type": "json" },
    { "key": "linkToPage", "label": "Link To Page", "type": "json" },
    { "key": "tableRow", "label": "Table Row", "type": "json" },
    { "key": "heading_1", "label": "Heading 1", "type": "json" },
    { "key": "heading_2", "label": "Heading 2", "type": "json" },
    { "key": "heading_3", "label": "Heading 3", "type": "json" },
    { "key": "heading_4", "label": "Heading 4", "type": "json" },
    { "key": "paragraph", "label": "Paragraph", "type": "json" },
    { "key": "bulletedListItem", "label": "Bulleted List Item", "type": "json" },
    { "key": "numberedListItem", "label": "Numbered List Item", "type": "json" },
    { "key": "quote", "label": "Quote", "type": "json" },
    { "key": "toDo", "label": "To Do", "type": "json" },
    { "key": "toggle", "label": "Toggle", "type": "json" },
    { "key": "template", "label": "Template", "type": "json" },
    { "key": "callout", "label": "Callout", "type": "json" },
    { "key": "syncedBlock", "label": "Synced Block", "type": "json" },
    { "key": "table", "label": "Table", "type": "json" },
    { "key": "column", "label": "Column", "type": "json" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/blocks/${pathId(input.blockId)}`, {
      method: "PATCH",
      body: {
        "embed": input.embed,
        "type": input.type,
        "in_trash": input.inTrash,
        "bookmark": input.bookmark,
        "image": input.image,
        "video": input.video,
        "pdf": input.pdf,
        "file": input.file,
        "audio": input.audio,
        "code": input.code,
        "equation": input.equation,
        "divider": input.divider,
        "breadcrumb": input.breadcrumb,
        "tab": input.tab,
        "table_of_contents": input.tableOfContents,
        "link_to_page": input.linkToPage,
        "table_row": input.tableRow,
        "heading_1": input.heading_1,
        "heading_2": input.heading_2,
        "heading_3": input.heading_3,
        "heading_4": input.heading_4,
        "paragraph": input.paragraph,
        "bulleted_list_item": input.bulletedListItem,
        "numbered_list_item": input.numberedListItem,
        "quote": input.quote,
        "to_do": input.toDo,
        "toggle": input.toggle,
        "template": input.template,
        "callout": input.callout,
        "synced_block": input.syncedBlock,
        "table": input.table,
        "column": input.column,
      },
    });
  },
};

export default action;
