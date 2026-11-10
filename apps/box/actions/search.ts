import type { ActionDefinition } from "@w6w/types";
import { BoxClient } from "../lib/client.ts";

interface Input {
  query: string;
  type?: "file" | "folder" | "web_link";
  scope?: "user_content" | "enterprise_content";
  fileExtensions?: string;
  ancestorFolderIds?: string;
  limit?: number;
  offset?: number;
  sort?: "modified_at" | "relevance";
  direction?: "ASC" | "DESC";
}

/**
 * Search for files, folders and web links by name, description, content and
 * other attributes.
 *
 * https://developer.box.com/reference/get-search/
 */
const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "search",
  title: "Search",
  description: "Search Box for files, folders and web links.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint:
        "Matched against item names, descriptions, text content of files, and other item fields.",
    },
    {
      key: "type",
      label: "Item type",
      type: "select",
      options: [
        { value: "file", label: "File" },
        { value: "folder", label: "Folder" },
        { value: "web_link", label: "Web Link" },
      ],
    },
    {
      key: "scope",
      label: "Scope",
      type: "select",
      options: [
        { value: "user_content", label: "User content" },
        { value: "enterprise_content", label: "Enterprise content" },
      ],
      default: "user_content",
    },
    {
      key: "fileExtensions",
      label: "File extensions",
      type: "string",
      hint: "Comma-separated, without dots, e.g. `pdf,png`.",
    },
    {
      key: "ancestorFolderIds",
      label: "Folder IDs",
      type: "string",
      hint: "Comma-separated Box folder IDs to restrict the search to.",
    },
    { key: "limit", label: "Page size", type: "number", default: 30, hint: "Maximum 200." },
    { key: "offset", label: "Offset", type: "number", default: 0, hint: "Maximum 10000." },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [
        { value: "relevance", label: "Relevance" },
        { value: "modified_at", label: "Last modified" },
      ],
      hint: "Leave empty for Box's default (relevance).",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "DESC", label: "Descending" },
        { value: "ASC", label: "Ascending" },
      ],
      hint: "Ignored when sorting by relevance.",
    },
  ],
  output: [
    { key: "entries", type: "array", label: "Entries" },
    { key: "total_count", type: "number", label: "Total count" },
  ],

  execute(input, ctx) {
    const client = new BoxClient(ctx);
    return client.request("/search", {
      query: {
        query: input.query,
        type: input.type,
        scope: input.scope ?? "user_content",
        file_extensions: input.fileExtensions,
        ancestor_folder_ids: input.ancestorFolderIds,
        limit: input.limit ?? 30,
        offset: input.offset ?? 0,
        sort: input.sort,
        direction: input.direction,
      },
    });
  },
};

export default search;
