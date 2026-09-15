import type { ActionDefinition } from "@w6w/types";
import { BexioClient, listQuery } from "../lib/client.ts";

interface Input {
  orderBy?: "id" | "date";
  descending?: boolean;
  limit?: number;
  offset?: number;
}

const timesheetList: ActionDefinition<Input> = {
  key: "timesheet-list",
  type: "read",
  resource: "timesheet",
  title: "List Timesheets",
  description: "Fetch a page of tracked timesheet entries.",
  params: [
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "id", label: "ID" },
        { value: "date", label: "Date" },
      ],
      default: "id",
    },
    { key: "descending", label: "Descending", type: "boolean", default: false },
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Max 2000." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "date", type: "string", label: "Date" },
    { key: "duration", type: "string", label: "Duration" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).list("/2.0/timesheet", listQuery(input));
  },
};

export default timesheetList;
