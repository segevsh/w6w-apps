import { pollSnapshot } from "../../_shared/poll/mod.ts";
import type { TriggerDefinition } from "@w6w/types";
import cohortList from "../actions/cohort-list.ts";

/**
 * Shape (c) snapshot: a project's saved cohorts are a small, hand-maintained collection (people
 * create them in the Mixpanel UI), returned whole by `POST /api/query/cohorts/list`. The trigger
 * calls the SAME `cohort-list` action and emits a cohort the first time its `id` appears.
 */
const trigger: TriggerDefinition = {
  key: "new-cohort",
  title: "New Cohort",
  description: "The run gets each Mixpanel cohort saved since the last check.",
  output: [
    { key: "id", type: "number", label: "Cohort ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "count", type: "number", label: "Size" },
  ],
  sample: { change: "added", key: "101", values: { id: 101, name: "Activated", count: 42 } },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await cohortList.execute({}, ctx) as { cohorts?: unknown };
    const cohorts = Array.isArray(result.cohorts) ? result.cohorts as Array<{ id?: unknown }> : [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: cohorts.map((c) => ({ key: String(c.id), values: { id: c.id } })),
      emit: { added: true, updated: false, removed: false },
    });
    // Hash only the id, so a size change is not an event; emit the full cohort record.
    const byId = new Map(cohorts.map((c) => [String(c.id), c]));
    return {
      events: events.map((e) => ({ ...e, values: byId.get(e.key) ?? e.values })),
      nextState,
    };
  },
};

export default trigger;
