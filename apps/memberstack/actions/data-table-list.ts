import type { ActionDefinition } from "@w6w/types";
import { MemberstackClient } from "../lib/client.ts";

/** `GET /v2/data-tables` — every table with its fields and access rules. */
type Input = Record<string, never>;

const dataTableList: ActionDefinition<Input> = {
  key: "data-table-list",
  type: "read",
  resource: "data-table",
  title: "List Data Tables",
  description: "List all Data Tables with their fields and access rules.",
  params: [],
  output: [{ key: "tables", type: "array", label: "Tables" }],

  async execute(_input, ctx) {
    const body = await new MemberstackClient(ctx).json<{ tables?: unknown[] }>("/v2/data-tables");
    return { tables: body?.tables ?? [] };
  },
};

export default dataTableList;
