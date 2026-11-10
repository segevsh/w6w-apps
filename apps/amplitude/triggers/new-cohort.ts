import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import cohortList from "../actions/cohort-list.ts";

interface Cohort {
  id?: string;
  name?: string;
  size?: number;
  last_computed?: number;
}

/**
 * Cohorts are a small per-project collection returned whole by `GET /api/3/cohorts`, so each check
 * diffs the ids against the previous check (`pollSnapshot`, added only: a cohort's `size` and
 * `last_computed` change on every recomputation and must not read as an update).
 */
const trigger: TriggerDefinition = {
  key: "new-cohort",
  title: "New Cohort",
  description: "The run gets each newly created behavioural cohort.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "Cohort ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "size", type: "number", label: "Size at last computation" },
  ],
  sample: { id: "abc123", name: "Power users", size: 1200 },
  async poll({ state }, ctx) {
    const result = await cohortList.execute({}, ctx) as { cohorts?: Cohort[] };
    const cohorts = (result.cohorts ?? []).filter((c) => c.id !== undefined && c.id !== "");
    const byId = new Map(cohorts.map((c) => [String(c.id), c]));
    const { events, nextState } = await pollSnapshot({
      state,
      rows: cohorts.map((c) => ({ key: String(c.id), values: { id: c.id } })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => byId.get(e.key)), nextState };
  },
};

export default trigger;
