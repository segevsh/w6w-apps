import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List comments, filtered and paged (`GET /comments`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  taskId?: number;
  projectId?: number;
  discussionId?: number;
  pageId?: number;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const commentList: ActionDefinition<Input> = {
  key: "comment-list",
  type: "search",
  resource: "comment",
  title: "List Comments",
  description: "List comments, filtered and paged (`GET /comments`).",
  params: [
    { "key": "taskId", "label": "Task ID", "type": "number" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    { "key": "discussionId", "label": "Discussion ID", "type": "number" },
    { "key": "pageId", "label": "Page ID", "type": "number" },
    ...listParams("`created_at`, `-created_at`."),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/comments", {
      query: listQuery(input, {
        "task_id": input.taskId,
        "project_id": input.projectId,
        "discussion_id": input.discussionId,
        "page_id": input.pageId,
      }),
    });
    return items;
  },
};

export default commentList;
