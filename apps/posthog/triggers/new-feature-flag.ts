import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { listAll, newRows } from "../lib/polls.ts";
import featureFlagList from "../actions/feature-flag-list.ts";

/**
 * `GET /api/projects/{project_id}/feature_flags/` has no sort or created-after filter, only
 * `search`, `active`, `archived` and the like with `limit`/`offset` (https://us.posthog.com/api/schema/
 * `feature_flags_list`, read 2026-11-10). A project's flags are a short list, so every check reads
 * all pages (100 per page) and diffs the ids against the previous one (`pollSnapshot`, added only).
 */
const newFeatureFlag: TriggerDefinition = {
  key: "new-feature-flag",
  title: "New Feature Flag",
  description: "The run gets each feature flag newly created in the PostHog project.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "number", label: "Flag ID" },
    { key: "key", type: "string", label: "Flag key" },
    { key: "name", type: "string", label: "Name" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 301,
    key: "new-checkout",
    name: "New checkout flow",
    active: true,
    created_at: "2026-11-10T09:00:00.000Z",
  },
  async poll({ state }, ctx) {
    return await newRows(
      state,
      await listAll(featureFlagList as unknown as ActionDefinition, {}, ctx),
    );
  },
};

export default newFeatureFlag;
