import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listsList from "../actions/lists-list.ts";

/** The lists endpoint is an unpaginated account collection; additions only are emitted. */
const trigger: TriggerDefinition = {
  key: "new-lead-list",
  title: "New Lead List",
  description: "The run gets each lead list newly created in Wappalyzer.",
  output: [{ key: "id", type: "string", label: "Lead list ID" }],
  sample: { id: "list-sample", name: "Prospects" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await listsList.execute({}, ctx) as { results?: unknown[] };
    const rows = (out.results ?? []).map((value) => ({
      key: String((value as { id?: unknown }).id ?? ""),
      values: value,
    }));
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
      maxRows: 5000,
    });
    return { events: events.map((event) => event.values), nextState };
  },
};

export default trigger;
