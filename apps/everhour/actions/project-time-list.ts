import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `GET /projects/{projectId}/time` — List the time records of one project.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  projectId: string;
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
}

const projectTimeList: ActionDefinition<Input> = {
  key: "project-time-list",
  type: "search",
  resource: "time-record",
  title: "List Project Time Records",
  description: "List the time records of one project.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint:
        "Everhour project id: `ev:1234567890` for a native project, or `{platform}:{id}` such as `as:123456` for an integration project.",
    },
    { key: "from", label: "From", type: "date", hint: "Start date, YYYY-MM-DD." },
    { key: "to", label: "To", type: "date", hint: "End date, YYYY-MM-DD." },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      hint: "Max records per page; the vendor maximum is 50000.",
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
    return new EverhourClient(ctx).many(`/projects/${encodeId(input.projectId)}/time`, {
      query: { "from": input.from, "to": input.to, "page": input.page, "limit": input.limit },
    });
  },
};

export default projectTimeList;
