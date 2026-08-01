import type { ActionDefinition } from "@w6w/types";
import { BoxClient } from "../lib/client.ts";

interface Input {
  folderId?: string;
  fields?: string;
  limit?: number;
  offset?: number;
  sort?: "id" | "name" | "date" | "size";
  direction?: "ASC" | "DESC";
  usemarker?: boolean;
  marker?: string;
}

/**
 * List the items (files, folders, web links) directly inside a folder.
 * `folderId` defaults to `"0"`, Box's id for the root ("All Files") folder.
 *
 * https://developer.box.com/reference/get-folders-id-items/
 */
const listFolderItems: ActionDefinition<Input> = {
  key: "list-folder-items",
  type: "read",
  resource: "folder",
  title: "List Folder Items",
  description: "List the files and folders inside a folder.",
  params: [
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      default: "0",
      hint: 'Box folder ID. "0" (the default) is the root folder.',
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated list of attributes to include in the response.",
    },
    { key: "limit", label: "Page size", type: "number", default: 100 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [
        { value: "id", label: "ID" },
        { value: "name", label: "Name" },
        { value: "date", label: "Date" },
        { value: "size", label: "Size" },
      ],
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
    {
      key: "usemarker",
      label: "Use marker-based pagination",
      type: "boolean",
      default: false,
      hint: "Switch to marker-based paging instead of offset-based.",
    },
    { key: "marker", label: "Marker", type: "string", hint: "Position marker from a prior page." },
  ],
  output: [
    { key: "entries", type: "array", label: "Entries" },
    { key: "total_count", type: "number", label: "Total count" },
    { key: "offset", type: "number", label: "Offset" },
    { key: "limit", type: "number", label: "Limit" },
  ],

  execute(input, ctx) {
    const client = new BoxClient(ctx);
    return client.request(`/folders/${input.folderId ?? "0"}/items`, {
      query: {
        fields: input.fields,
        limit: input.limit ?? 100,
        offset: input.offset ?? 0,
        sort: input.sort,
        direction: input.direction,
        usemarker: input.usemarker ?? false,
        marker: input.marker,
      },
    });
  },
};

export default listFolderItems;
