import type { ActionDefinition } from "@w6w/types";
import { enc, listResult, ProjectsClient } from "../lib/client.ts";
import { page, perPage, portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  viewType: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}

const timelogList: ActionDefinition<Input> = {
  key: "timelog-list",
  type: "read",
  resource: "timelog",
  title: "List Time Logs",
  description:
    "List the time logs of a project for a day, week, month, custom date range or the whole project span.",
  params: [
    portalId,
    projectId,
    {
      key: "viewType",
      label: "View Type",
      type: "select",
      required: true,
      hint: "`customdate` ranges must not exceed 6 months; `projectspan` ignores the dates.",
      options: [
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
        { value: "month", label: "Month" },
        { value: "customdate", label: "Custom date range" },
        { value: "projectspan", label: "Project span" },
      ],
    },
    { key: "startDate", label: "Start Date", type: "string", hint: "YYYY-MM-DD." },
    { key: "endDate", label: "End Date", type: "string", hint: "YYYY-MM-DD." },
    page,
    perPage,
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "hasNext", type: "boolean", label: "More pages available" },
    { key: "page", type: "number", label: "Page number returned" },
  ],

  async execute(input, ctx) {
    const client = new ProjectsClient(ctx);
    return listResult(
      await client.get(`/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/timelogs`, {
        view_type: input.viewType,
        start_date: input.startDate,
        end_date: input.endDate,
        page: input.page,
        per_page: input.perPage,
      }),
      "time_logs",
    );
  },
};

export default timelogList;
