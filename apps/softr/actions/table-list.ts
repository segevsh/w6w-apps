import type { ActionDefinition } from "@w6w/types";
import { encodeId, TablesClient } from "../lib/client.ts";
import { databaseIdParam } from "../lib/params.ts";

/**
 * `GET /databases/{databaseId}/tables` — every table in a Database, including
 * each table's full field list (id, name, type, and — for AI columns —
 * `aiOptions`). Read this before Create/Update Record: the `fields` payload on
 * those endpoints is keyed by the field IDs this call returns.
 */
interface Input {
  databaseId: string;
}

const tableList: ActionDefinition<Input> = {
  key: "table-list",
  type: "search",
  resource: "table",
  title: "List Tables",
  description: "List the tables in a Softr Database, including each table's fields.",
  params: [databaseIdParam],
  output: [{ key: "data", type: "array", label: "Tables" }],

  async execute(input, ctx) {
    const data = await new TablesClient(ctx).data<unknown[]>(
      `/databases/${encodeId(input.databaseId)}/tables`,
    );
    return { data: data ?? [] };
  },
};

export default tableList;
