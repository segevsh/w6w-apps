import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `GET /projects/{projectId}/tasks/search` — Search tasks within one project.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  projectId: string;
  query?: string;
  limit?: number;
  searchInClosed?: boolean;
}

const projectTaskSearch: ActionDefinition<Input> = {
  key: "project-task-search",
  type: "search",
  resource: "task",
  title: "Search Project Tasks",
  description: "Search tasks within one project.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint:
        "Everhour project id: `ev:1234567890` for a native project, or `{platform}:{id}` such as `as:123456` for an integration project.",
    },
    { key: "query", label: "Search text", type: "string", hint: "Task name search." },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      hint: "Max results (vendor example: 10).",
    },
    { key: "searchInClosed", label: "Search closed tasks", type: "boolean" },
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
    return new EverhourClient(ctx).many(`/projects/${encodeId(input.projectId)}/tasks/search`, {
      query: { "query": input.query, "limit": input.limit, "searchInClosed": input.searchInClosed },
    });
  },
};

export default projectTaskSearch;
