import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient } from "../lib/client.ts";

interface Input {
  projectId: number;
  device: string;
  date: string;
  select?: string;
  where?: string;
  orderBy?: string;
  limit?: number;
  dateCompared?: string;
  volumeMode?: string;
}
const DEFAULT_SELECT = "keyword,position,position_prev,url,volume,traffic,keyword_difficulty";
/** `GET /rank-tracker/overview` — response key `overviews`. */
const rankTrackerOverviewGet: ActionDefinition<Input> = {
  key: "rank-tracker-overview-get",
  type: "read",
  resource: "ranking",
  title: "Get Rank Tracker Overview",
  description: "Keyword positions, traffic and changes for a Rank Tracker project on a date.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "number",
      required: true,
      hint: "The numeric project id (from the project's URL or List Projects).",
      validation: { min: 1, integer: true },
    },
    {
      key: "device",
      label: "Device",
      type: "select",
      required: true,
      hint: "Desktop or mobile rankings.",
      options: [{ value: "desktop", label: "Desktop" }, { value: "mobile", label: "Mobile" }],
    },
    {
      key: "date",
      label: "Date",
      type: "string",
      required: true,
      hint: "Report date, `YYYY-MM-DD`.",
    },
    {
      key: "select",
      label: "Columns",
      type: "string",
      hint:
        "Comma-separated columns to return. Each extra column adds API units. Default: `keyword,position,position_prev,url,volume,traffic,keyword_difficulty`.",
    },
    {
      key: "where",
      label: "Filter",
      type: "string",
      hint:
        'Optional Ahrefs filter expression (JSON text), e.g. `{"field":"is_dofollow","is":["eq",1]}`. See Ahrefs \'Filter syntax\'.',
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "string",
      hint: "A column, optionally with direction, e.g. `traffic:desc`.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint:
        "Maximum rows to return. Ahrefs has no offset: limit is the only paging control, and every row costs units.",
      validation: { min: 1, integer: true },
    },
    {
      key: "dateCompared",
      label: "Compare date",
      type: "string",
      hint: "Optional `YYYY-MM-DD` to compare metrics against.",
    },
    {
      key: "volumeMode",
      label: "Volume mode",
      type: "select",
      hint: "How search volume is calculated. Omit for Ahrefs' default.",
      options: [{ value: "monthly", label: "Monthly" }, { value: "average", label: "Average" }],
    },
  ],
  output: [
    { key: "overviews", type: "array", label: "Tracked keywords" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/rank-tracker/overview", {
      project_id: input.projectId,
      device: input.device,
      date: input.date,
      select: input.select ?? DEFAULT_SELECT,
      where: input.where,
      order_by: input.orderBy,
      limit: input.limit,
      date_compared: input.dateCompared,
      volume_mode: input.volumeMode,
    });
  },
};

export default rankTrackerOverviewGet;
