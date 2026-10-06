import type { ActionDefinition } from "@w6w/types";
import { listResult, pageQuery, WorkDriveClient } from "../lib/client.ts";
import { listOutput, pagingParams } from "../lib/params.ts";

interface Input {
  folderId: string;
  limit?: number;
  offset?: number;
  next?: string;
  filterType?: string;
}

/**
 * `GET /files/{folder_id}/files`. Offset pagination is capped at 50 per page; cursor pagination
 * (`next` = `0` first, then the returned cursor) returns up to 1000.
 */
const fileList: ActionDefinition<Input> = {
  key: "file-list",
  type: "read",
  resource: "file",
  title: "List Folder Contents",
  description: "List the files and sub-folders inside a folder.",
  params: [
    { key: "folderId", label: "Folder ID", type: "string", required: true },
    ...pagingParams,
  ],
  output: [...listOutput],

  async execute(input, ctx) {
    const body = await new WorkDriveClient(ctx).get(
      `/files/${encodeURIComponent(input.folderId)}/files`,
      pageQuery(input),
    );
    return listResult(body);
  },
};

export default fileList;
