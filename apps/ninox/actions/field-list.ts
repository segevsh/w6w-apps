import type { ActionDefinition } from "@w6w/types";
import {
  LIMIT_PARAM,
  MODULE_PARAM,
  NinoxClient,
  OFFSET_PARAM,
  TABLE_PARAM,
} from "../lib/client.ts";

/** `GET .../tables/{tableName}/fields`. */
interface Input {
  moduleName: string;
  tableName: string;
  limit?: number;
  offset?: number;
}

interface Output {
  fields: unknown[];
  hasMore: boolean;
}

const fieldList: ActionDefinition<Input, Output> = {
  key: "field-list",
  type: "read",
  resource: "field",
  title: "List Fields",
  description: "List a table's fields with their types, options and permission guards.",
  params: [MODULE_PARAM, TABLE_PARAM, LIMIT_PARAM, OFFSET_PARAM],
  output: [
    { key: "fields", type: "array", label: "Fields" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
  ],

  async execute(input, ctx) {
    const client = new NinoxClient(ctx);
    const { items, hasMore } = await client.list(`${client.tablePath(input)}/fields`, {
      limit: input.limit,
      offset: input.offset,
    });
    return { fields: items, hasMore };
  },
};

export default fieldList;
