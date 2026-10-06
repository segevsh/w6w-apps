import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `GET /projects/{projectId}/tasks` — List the tasks in a project.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  projectId: string;
  query?: string;
  excludeClosed?: boolean;
  limit?: number;
  page?: number;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Project Tasks",
  description: "List the tasks in a project.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint:
        "Everhour project id: `ev:1234567890` for a native project, or `{platform}:{id}` such as `as:123456` for an integration project.",
    },
    { key: "query", label: "Name contains", type: "string" },
    {
      key: "excludeClosed",
      label: "Exclude closed",
      type: "boolean",
      hint: "Leave out closed/completed tasks.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      hint: "Tasks per page, 250 max.",
    },
    { key: "page", label: "Page", type: "number", hint: "Results page, starting at 1." },
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "count", type: "number", label: "Records in this response" },
    {
      key: "nextPage",
      type: "number",
      label: "Next page number, or null when there is no further page",
    },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).many(`/projects/${encodeId(input.projectId)}/tasks`, {
      query: {
        "query": input.query,
        "exclude-closed": input.excludeClosed,
        "limit": input.limit,
        "page": input.page,
      },
    });
  },
};

export default taskList;
