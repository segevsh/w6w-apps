import type { ActionDefinition } from "@w6w/types";
import { EverhourClient } from "../lib/client.ts";

/**
 * `GET /dashboards/projects` — Totals per project (time in seconds, amounts in cents).
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  dateGte?: string;
  dateLte?: string;
  projectId?: string;
  clientId?: number;
  memberId?: number;
}

const projectReport: ActionDefinition<Input> = {
  key: "project-report",
  type: "search",
  resource: "report",
  title: "Projects Report",
  description: "Totals per project (time in seconds, amounts in cents).",
  params: [
    {
      key: "dateGte",
      label: "From date",
      type: "date",
      hint: "Report start date, YYYY-MM-DD (`date.gte`).",
    },
    {
      key: "dateLte",
      label: "To date",
      type: "date",
      hint: "Report end date, YYYY-MM-DD (`date.lte`).",
    },
    { key: "projectId", label: "Project ID", type: "string" },
    { key: "clientId", label: "Client ID", type: "number" },
    { key: "memberId", label: "User ID", type: "number" },
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
    return new EverhourClient(ctx).many(`/dashboards/projects`, {
      query: {
        "date.gte": input.dateGte,
        "date.lte": input.dateLte,
        "projectId": input.projectId,
        "clientId": input.clientId,
        "memberId": input.memberId,
      },
    });
  },
};

export default projectReport;
