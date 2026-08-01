import type { ActionDefinition } from "@w6w/types";
import { FigmaClient } from "../lib/client.ts";

interface Input {
  fileKey: string;
}

/**
 * GET /v1/files/{file_key}/versions — list a file's saved version history.
 * Requires `file_versions:read`. Starter-plan teams only see 30 days of
 * history; Professional/Education/Organization teams see the full history.
 * Pagination is a cursor URL under `pagination.next_page` / `.prev_page`
 * rather than a documented page-size query param, so it is passed through
 * verbatim for the caller to follow.
 */
const getFileVersions: ActionDefinition<Input> = {
  key: "get-file-versions",
  type: "read",
  resource: "file",
  title: "Get File Versions",
  description: "List the saved version history of a file.",
  params: [
    { key: "fileKey", label: "File key", type: "string", required: true },
  ],
  output: [
    { key: "versions", type: "array", label: "Versions" },
    { key: "pagination", type: "object", label: "Pagination cursors" },
  ],

  execute(input, ctx) {
    const client = new FigmaClient(ctx);
    return client.request(`/v1/files/${encodeURIComponent(input.fileKey)}/versions`);
  },
};

export default getFileVersions;
