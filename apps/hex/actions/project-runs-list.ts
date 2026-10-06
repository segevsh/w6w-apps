import type { ActionDefinition } from "@w6w/types";
import { encodeId, HexClient } from "../lib/client.ts";
import { projectIdParam, runStatusOptions } from "../lib/params.ts";

/**
 * `GET /v1/projects/{projectId}/runs` — runs of one project.
 *
 * The one list endpoint that pages by `limit`/`offset` (max 100) rather than by
 * cursor; the response carries `nextPage` / `previousPage` URLs. By default every
 * trigger type is returned (API, scheduled and app-refresh runs).
 */
interface Input {
  projectId: string;
  statusFilter?: string;
  runTriggerFilter?: string;
  limit?: number;
  offset?: number;
}

const projectRunsList: ActionDefinition<Input> = {
  key: "project-runs-list",
  type: "search",
  resource: "run",
  title: "List Project Runs",
  description: "List runs of a project, optionally filtered by status and trigger type.",
  params: [
    projectIdParam,
    { key: "statusFilter", label: "Status", type: "select", options: runStatusOptions },
    {
      key: "runTriggerFilter",
      label: "Trigger",
      type: "select",
      options: [
        { value: "ALL", label: "All" },
        { value: "API", label: "API" },
        { value: "SCHEDULED", label: "Scheduled" },
        { value: "APP_REFRESH", label: "App refresh" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1, max: 100 },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Number of runs to skip.",
    },
  ],
  output: [
    { key: "runs", type: "array", label: "Runs" },
    { key: "nextPage", type: "string", label: "URL of the next page, or null" },
    { key: "previousPage", type: "string", label: "URL of the previous page, or null" },
  ],

  execute(input, ctx) {
    return new HexClient(ctx).json(`/projects/${encodeId(input.projectId)}/runs`, {
      query: {
        statusFilter: input.statusFilter,
        runTriggerFilter: input.runTriggerFilter,
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default projectRunsList;
