import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import action from "../actions/list-tables.ts";

/** A Quickbase application holds a small, bounded set of tables and `GET /tables` returns the whole set as one bare array (no paging), so the set is diffed. */
const trigger: TriggerDefinition = {
  key: "new-table",
  title: "New Table",
  description: "The run gets each table added to the application since the last check.",
  params: [
    {
      key: "appId",
      label: "Application ID",
      type: "string",
      placeholder: "bqrxxxxxx",
      hint: "Defaults to the application recorded on the connection.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Table ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }],
  sample: { id: "bq1", name: "Leads", created: "2026-11-09T10:00:00Z" },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const result = await action.execute(
      { appId: (params as { appId?: string }).appId },
      ctx,
    ) as unknown;

    const rows = (Array.isArray(result) ? result : []).map((item) => ({
      key: String((item as { id: string }).id),
      values: item,
    }));
    // Added only: an edited or removed record is not a "new" record, so it never fires.
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((e) => e.values), nextState };
  },
};

export default trigger;
