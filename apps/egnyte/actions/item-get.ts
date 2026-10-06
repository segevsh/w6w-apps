import type { ActionDefinition } from "@w6w/types";
import { compact, EgnyteClient, encodePath } from "../lib/client.ts";
import { pathParam, sortDirection } from "../lib/params.ts";

interface Input {
  path: string;
  listContent?: boolean;
  count?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: string;
}

const itemGet: ActionDefinition<Input> = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get File or Folder",
  description:
    "Fetch metadata for a file or folder by path. For a folder, turn on 'List contents' to include its files and subfolders (paginated); for a file it includes its versions.",
  params: [
    pathParam(),
    { key: "listContent", label: "List contents", type: "boolean", default: true },
    {
      key: "count",
      label: "Count",
      type: "number",
      advanced: true,
      row: "page",
      validation: { min: 1, integer: true },
      hint: "Maximum number of items to return.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      advanced: true,
      row: "page",
      validation: { min: 0, integer: true },
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      advanced: true,
      row: "sort",
      options: [
        { value: "name", label: "Name" },
        { value: "last_modified", label: "Last modified" },
        { value: "uploaded_by", label: "Uploaded by" },
      ],
    },
    { ...sortDirection, advanced: true },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "path", type: "string", label: "Path" },
    { key: "is_folder", type: "boolean", label: "Is folder" },
    { key: "folder_id", type: "string", label: "Folder ID" },
    { key: "group_id", type: "string", label: "File ID" },
    { key: "files", type: "array", label: "Files" },
    { key: "folders", type: "array", label: "Folders" },
  ],

  execute(input, ctx) {
    return new EgnyteClient(ctx).request(`/v1/fs/${encodePath(input.path)}`, {
      query: compact({
        list_content: input.listContent === false ? "false" : undefined,
        count: input.count,
        offset: input.offset,
        sort_by: input.sortBy,
        sort_direction: input.sortDirection,
      }) as Record<string, string>,
    });
  },
};

export default itemGet;
