import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listGrowthTools from "../actions/list-growth-tools.ts";

interface Row {
  id?: unknown;
}

/**
 * Shape (c): `GET /fb/page/getGrowthTools` answers the Page's whole growth tool collection in ONE call (it takes no paging
 * parameters), so the check diffs the full set of `id` keys and emits only `added`.
 */
const trigger: TriggerDefinition = {
  key: "new-growth-tool",
  title: "New Growth Tool",
  description:
    "The run gets each growth tool newly added to the Page, polled from the existing `list-growth-tools` action.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "number", label: "Growth tool ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
  ],
  sample: { id: 7, name: "Homepage widget", type: "customer_chat" },
  async poll({ state }, ctx: HookContext) {
    const result = await listGrowthTools.execute({}, ctx) as { data?: Row[] };
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
