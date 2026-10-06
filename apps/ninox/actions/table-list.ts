import type { ActionDefinition } from "@w6w/types";
import { LIMIT_PARAM, MODULE_PARAM, NinoxClient, OFFSET_PARAM, seg } from "../lib/client.ts";

/** `GET /workspace/{workspaceId}/modules/{moduleName}/tables`. */
interface Input {
  moduleName: string;
  limit?: number;
  offset?: number;
}

interface Output {
  tables: unknown[];
  hasMore: boolean;
}

const tableList: ActionDefinition<Input, Output> = {
  key: "table-list",
  type: "read",
  resource: "table",
  title: "List Tables",
  description: "List the tables in a module, each with its fields.",
  params: [MODULE_PARAM, LIMIT_PARAM, OFFSET_PARAM],
  output: [
    { key: "tables", type: "array", label: "Tables" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
  ],

  async execute(input, ctx) {
    const { items, hasMore } = await new NinoxClient(ctx).list(
      `/modules/${seg(input.moduleName)}/tables`,
      { limit: input.limit, offset: input.offset },
    );
    return { tables: items, hasMore };
  },
};

export default tableList;
