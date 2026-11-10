import type { TriggerDefinition } from "@w6w/types";
import teamList from "../actions/team-list.ts";
import { ORG_PARAM } from "../lib/params.ts";
import { newRecords } from "../lib/triggers.ts";

/**
 * `GET /api/0/organizations/{org}/teams/` is a cursor-paged list with no sort or date filter (https://docs.sentry.io/api/teams/list-an-organizations-teams/, verified 2026-11-10); an organization's teams are a small bounded collection. `detailed` is off so the projects of each team are not fetched.
 * Every check reads the whole list through `team-list` (`returnAll`) and diffs the ids
 * (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-team",
  title: "New Team",
  description: "The run gets each team newly created in a Sentry organization.",
  params: [ORG_PARAM],
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "name", type: "string", label: "Name" },
    { key: "memberCount", type: "number", label: "Members" },
    { key: "dateCreated", type: "string", label: "Created at" },
  ],
  sample: {
    id: "48531",
    slug: "backend-team",
    name: "Backend Team",
    memberCount: 2,
    dateCreated: "2026-11-10T09:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const p = (params ?? {}) as Record<string, unknown>;
    const items = await teamList.execute({
      organizationSlug: p.organizationSlug,
      returnAll: true,
      detailed: false,
    }, ctx);
    return newRecords({
      state,
      items: Array.isArray(items) ? items : [],
      idOf: (item) => (item as { id?: unknown }).id,
    });
  },
};

export default trigger;
