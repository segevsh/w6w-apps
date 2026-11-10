import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { listAll, newRows } from "../lib/polls.ts";
import cohortList from "../actions/cohort-list.ts";

/**
 * `GET /api/projects/{project_id}/cohorts/` has no sort or created-after filter, only `search`,
 * `type`, `limit` and `offset` (https://us.posthog.com/api/schema/ `cohorts_list`, read
 * 2026-11-10). A project's saved cohorts are a short list, so every check reads all pages (100 per
 * page) and diffs the ids against the previous one (`pollSnapshot`, added only).
 */
const newCohort: TriggerDefinition = {
  key: "new-cohort",
  title: "New Cohort",
  description: "The run gets each cohort newly saved in the PostHog project.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "number", label: "Cohort ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "count", type: "number", label: "Persons in the cohort" },
    { key: "is_static", type: "boolean", label: "Static" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 12,
    name: "Power users",
    count: 340,
    is_static: false,
    created_at: "2026-11-10T09:00:00.000Z",
  },
  async poll({ state }, ctx) {
    return await newRows(state, await listAll(cohortList as unknown as ActionDefinition, {}, ctx));
  },
};

export default newCohort;
