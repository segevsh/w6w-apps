import type { ActionDefinition } from "@w6w/types";
import { MODULE_PARAM, NinoxClient, TABLE_PARAM } from "../lib/client.ts";

/** `GET .../tables/{tableName}/reports`. */
interface Input {
  moduleName: string;
  tableName: string;
}

interface Output {
  reports: unknown[];
}

const reportList: ActionDefinition<Input, Output> = {
  key: "report-list",
  type: "read",
  resource: "report",
  title: "List Reports",
  description: "List the printable reports defined on a table; each has the id Print Report needs.",
  params: [MODULE_PARAM, TABLE_PARAM],
  output: [{ key: "reports", type: "array", label: "Reports" }],

  async execute(input, ctx) {
    const client = new NinoxClient(ctx);
    const reports = await client.data<unknown[]>(`${client.tablePath(input)}/reports`);
    return { reports: Array.isArray(reports) ? reports : [] };
  },
};

export default reportList;
