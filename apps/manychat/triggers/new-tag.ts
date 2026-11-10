import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listTags from "../actions/list-tags.ts";

interface Row {
  id?: unknown;
}

/**
 * Shape (c): `GET /fb/page/getTags` answers the Page's whole tag collection in ONE call (it takes no paging
 * parameters), so the check diffs the full set of `id` keys and emits only `added`.
 */
const trigger: TriggerDefinition = {
  key: "new-tag",
  title: "New Tag",
  description:
    "The run gets each tag newly added to the Page, polled from the existing `list-tags` action.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Tag name" },
  ],
  sample: { id: 1, name: "vip" },
  async poll({ state }, ctx: HookContext) {
    const result = await listTags.execute({}, ctx) as { data?: Row[] };
    const rows = (result.data ?? []).filter((r) =>
      r.id !== undefined && r.id !== null && r.id !== ""
    );
    const { events, nextState } = await pollSnapshot({
      state,
      rows: rows.map((r) => ({ key: String(r.id), values: r })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((e) => e.values), nextState };
  },
};

export default trigger;
