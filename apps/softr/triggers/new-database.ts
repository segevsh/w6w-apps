import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import action from "../actions/database-list.ts";

/** Most databases one snapshot holds; `pollSnapshot` throws above this instead of truncating. */
const MAX_ROWS = 5000;

interface Database {
  id: string;
}

/**
 * `GET /databases` (the `database-list` action): the vendor documents no query parameters on it
 * (see the README), so one request returns every database the token's workspaces hold — a small
 * bounded collection that is snapshotted and diffed.
 */
const trigger: TriggerDefinition = {
  key: "new-database",
  title: "New Database",
  description: "The run gets each Softr Database newly created in the token's workspaces.",
  output: [
    { key: "change", type: "string", label: "Change (added)" },
    { key: "key", type: "string", label: "Database ID" },
    { key: "values", type: "object", label: "Database (id, name, workspaceId, tablesCount, …)" },
  ],
  sample: {
    change: "added",
    key: "db_8b1f0c2e",
    values: {
      id: "db_8b1f0c2e",
      name: "CRM",
      description: null,
      workspaceId: "ws_41ac77d0",
      tablesCount: 3,
      createdAt: "2026-11-09T09:00:00Z",
      updatedAt: "2026-11-09T09:00:00Z",
    },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const res = await action.execute({}, ctx) as { data?: Database[] };
    return await pollSnapshot({
      state,
      maxRows: MAX_ROWS,
      emit: { added: true, updated: false },
      rows: (res.data ?? []).map((db) => ({ key: String(db.id), values: db })),
    });
  },
};

export default trigger;
