import type { ActionDefinition } from "@w6w/types";
import { MODULE_PARAM, NinoxClient, TABLE_PARAM } from "../lib/client.ts";

/** `GET /workspace/{workspaceId}/modules/{moduleName}/tables/{tableName}`. */
interface Input {
  moduleName: string;
  tableName: string;
}

interface Output {
  table: unknown;
}

const tableGet: ActionDefinition<Input, Output> = {
  key: "table-get",
  type: "read",
  resource: "table",
  title: "Get Table",
  description: "Read one table's definition: fields, permission guards and whether it keeps " +
    "history (required by List Record Changes).",
  params: [MODULE_PARAM, TABLE_PARAM],
  output: [{ key: "table", type: "object", label: "Table" }],

  async execute(input, ctx) {
    const client = new NinoxClient(ctx);
    return { table: await client.data(client.tablePath(input)) };
  },
};

export default tableGet;
