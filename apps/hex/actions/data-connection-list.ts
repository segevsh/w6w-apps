import type { ActionDefinition } from "@w6w/types";
import { HexClient, type HexCursorPage } from "../lib/client.ts";
import { CURSOR_OUTPUT, type CursorInput, cursorParams } from "../lib/params.ts";

/**
 * `GET /v1/data-connections` — warehouse connections (athena, bigquery, clickhouse,
 * databricks, postgres, redshift, snowflake, trino). Each value is either the full
 * connection or a basic `{ id, name, type, sensitivity }`, depending on the token's
 * access.
 */
interface Input extends CursorInput {
  sortBy?: string;
  sortDirection?: string;
}

const dataConnectionList: ActionDefinition<Input> = {
  key: "data-connection-list",
  type: "search",
  resource: "data-connection",
  title: "List Data Connections",
  description: "List the workspace's data-warehouse connections.",
  params: [
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [{ value: "NAME", label: "Name" }, { value: "CREATED_AT", label: "Created" }],
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [{ value: "ASC", label: "Ascending" }, { value: "DESC", label: "Descending" }],
    },
    ...cursorParams(100),
  ],
  output: [...CURSOR_OUTPUT],

  execute(input, ctx) {
    return new HexClient(ctx).json<HexCursorPage<unknown>>("/data-connections", {
      query: {
        sortBy: input.sortBy,
        sortDirection: input.sortDirection,
        limit: input.limit,
        after: input.after,
      },
    });
  },
};

export default dataConnectionList;
