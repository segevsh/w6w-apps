import type { ActionDefinition } from "@w6w/types";
import { Document360Client, encodeId } from "../lib/client.ts";
import {
  folderIdParam,
  pageParam,
  pageSizeParam,
  pagingQuery,
  projectIdParam,
} from "../lib/params.ts";

/** Fetch a Drive folder with a page of the files inside it. Sub-folders are always returned in full. */
interface Input {
  projectId?: string;
  folderId: string;
  page?: number;
  pageSize?: number;
}

const driveFolderGet: ActionDefinition<Input> = {
  key: "drive-folder-get",
  type: "read",
  resource: "drive",
  title: "Get Drive Folder",
  description:
    "Fetch a Drive folder with a page of the files inside it. Sub-folders are always returned in full.",
  params: [projectIdParam, folderIdParam, pageParam, pageSizeParam],
  output: [
    { key: "id", type: "string", label: "Folder ID" },
    { key: "title", type: "string", label: "Folder name" },
    { key: "files", type: "array", label: "Files on this page" },
    { key: "files_pagination", type: "object", label: "File pagination block" },
  ],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    const { page, page_size } = pagingQuery(input);
    return await c.data(
      "GET",
      c.projectPath(input.projectId, `/drive/folders/${encodeId(input.folderId)}`),
      {
        query: { page, page_size },
      },
    );
  },
};

export default driveFolderGet;
