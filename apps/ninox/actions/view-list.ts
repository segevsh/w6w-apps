import type { ActionDefinition } from "@w6w/types";
import { MODULE_PARAM, NinoxClient, TABLE_PARAM } from "../lib/client.ts";

/** `GET .../tables/{tableName}/views`. */
interface Input {
  moduleName: string;
  tableName: string;
}

interface Output {
  views: unknown[];
}

const viewList: ActionDefinition<Input, Output> = {
  key: "view-list",
  type: "read",
  resource: "view",
  title: "List Views",
  description: "List the views defined on a table (columns, filters, grouping, chart config).",
  params: [MODULE_PARAM, TABLE_PARAM],
  output: [{ key: "views", type: "array", label: "Views" }],

  async execute(input, ctx) {
    const client = new NinoxClient(ctx);
    const views = await client.data<unknown[]>(`${client.tablePath(input)}/views`);
    return { views: Array.isArray(views) ? views : [] };
  },
};

export default viewList;
