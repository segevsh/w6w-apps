import type { ActionDefinition } from "@w6w/types";
import { SmartSuiteClient } from "../lib/client.ts";

/**
 * `GET /applications/` — every Table in the workspace.
 *
 * SmartSuite calls a Table an **App** in its API (`/applications/`), so the
 * ids returned here are what every field, record and comment action below
 * takes as `tableId`. Like `list-solutions`, the response is a bare array.
 */
const listTables: ActionDefinition<Record<string, never>, unknown[]> = {
  key: "list-tables",
  type: "read",
  resource: "table",
  title: "List Tables",
  description:
    "List every Table (SmartSuite calls them Apps in the API) in the workspace (GET /applications/).",
  params: [],
  output: [
    { key: "[]", type: "array", label: "Tables — a bare array, not an envelope" },
  ],

  async execute(_input, ctx) {
    const tables = await new SmartSuiteClient(ctx).request<unknown[]>("applications/");
    return Array.isArray(tables) ? tables : [];
  },
};

export default listTables;
