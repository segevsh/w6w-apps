import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { workspaceIdParam } from "../lib/params.ts";

interface Input {
  workspaceId: string;
}

/**
 * GET /workspaces/{workspaceId}/folders — the workspace's folder tree.
 *
 * Unpaginated: this endpoint returns a bare JSON array, not the
 * `{ items, page, limit, total, hasMore }` envelope the other collections use.
 * Each folder carries a nullable `parentId`, so nesting is reconstructed from
 * the flat list.
 */
const folderGetMany: ActionDefinition<Input, Record<string, unknown>> = {
  key: "folder-get-many",
  type: "search",
  resource: "folder",
  title: "Get Many Folders",
  description: "List every folder in a workspace. Not paginated — returns the full list.",
  params: [workspaceIdParam],
  output: [
    { key: "items", type: "array", label: "Folders" },
    { key: "count", type: "number", label: "Number of folders" },
  ],

  async execute(input, ctx) {
    const folders = await new TallyClient(ctx).request<unknown[]>(
      `/workspaces/${encodeURIComponent(input.workspaceId)}/folders`,
    );
    const items = Array.isArray(folders) ? folders : [];
    return { items, count: items.length };
  },
};

export default folderGetMany;
