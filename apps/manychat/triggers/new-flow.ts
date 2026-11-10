import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listFlows from "../actions/list-flows.ts";

interface Flow {
  ns?: unknown;
  name?: unknown;
}

/**
 * Shape (c): `GET /fb/page/getFlows` answers the Page's whole flow collection in ONE call (it takes
 * no paging parameters), so the check diffs the full set of `ns` keys and emits only `added`.
 */
const trigger: TriggerDefinition = {
  key: "new-flow",
  title: "New Flow",
  description: "The run gets each flow newly added to the Page: its namespace id and name.",
  minIntervalMs: 300_000,
  output: [
    { key: "ns", type: "string", label: "Flow namespace (ID)" },
    { key: "name", type: "string", label: "Flow name" },
  ],
  sample: { ns: "content20260101000000_000000", name: "Welcome flow" },
  async poll({ state }, ctx: HookContext) {
    const result = await listFlows.execute({}, ctx) as { data?: { flows?: Flow[] } };
    const flows = (result.data?.flows ?? []).filter((f) => typeof f.ns === "string" && f.ns !== "");
    const { events, nextState } = await pollSnapshot({
      state,
      rows: flows.map((f) => ({ key: String(f.ns), values: f })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((e) => e.values), nextState };
  },
};

export default trigger;
