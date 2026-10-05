import type { ActionDefinition } from "@w6w/types";
import { GranolaClient, type GranolaFolder } from "../lib/client.ts";
import { cursorParam, pageSizeParam } from "../lib/params.ts";

/** `GET /v1/folders` — one page of folders. Their IDs scope List Notes and webhooks. */
interface Input {
  cursor?: string;
  pageSize?: number;
}

const folderList: ActionDefinition<Input> = {
  key: "folder-list",
  type: "read",
  resource: "folder",
  title: "List Folders",
  description: "List folders (id, name, parent) so notes and webhooks can be scoped to one.",
  params: [cursorParam, pageSizeParam(30, "folders")],
  output: [
    { key: "folders", type: "array", label: "Folders (id, name, parent_folder_id)" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
    { key: "cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new GranolaClient(ctx).request<
      { folders: GranolaFolder[]; hasMore: boolean; cursor: string | null }
    >("/folders", { query: { cursor: input.cursor, page_size: input.pageSize } });
  },
};

export default folderList;
