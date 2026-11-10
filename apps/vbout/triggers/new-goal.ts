import goalList from "../actions/goal-list.ts";
import { itemsOf, snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /1/goal/lists.json` through `goal-list`: no paging parameters, every conversion goal of the
 * account in one response (https://developers.vbout.com/scripts/openapi.json, `Goal/Lists`), so the
 * whole collection is snapshot-diffed (additions only).
 */
export default snapshotTrigger({
  key: "new-goal",
  title: "New Goal",
  description: "The run gets each conversion goal newly created in Vbout.",
  output: [
    { key: "id", type: "string", label: "Goal ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Goal type" },
  ],
  sample: { id: "41", name: "Cart conversion (All Links)", type: "Event Triggered" },
  rows: async (_params, ctx) => itemsOf(await goalList.execute({} as never, ctx), "goals"),
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
});
