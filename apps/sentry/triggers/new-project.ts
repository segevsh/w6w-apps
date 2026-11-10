import type { TriggerDefinition } from "@w6w/types";
import projectList from "../actions/project-list.ts";
import { ORG_PARAM } from "../lib/params.ts";
import { newRecords } from "../lib/triggers.ts";

/**
 * `GET /api/0/organizations/{org}/projects/` is a cursor-paged list with no sort or date filter (https://docs.sentry.io/api/organizations/list-an-organizations-projects/, verified 2026-11-10); an organization's projects are a small bounded collection.
 * Every check reads the whole list through `project-list` (`returnAll`) and diffs the ids
 * (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-project",
  title: "New Project",
  description: "The run gets each project newly created in a Sentry organization.",
  params: [ORG_PARAM],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "name", type: "string", label: "Name" },
    { key: "platform", type: "string", label: "Platform" },
    { key: "dateCreated", type: "string", label: "Created at" },
  ],
  sample: {
    id: "3",
    slug: "backend",
    name: "Backend",
    platform: "node",
    dateCreated: "2026-11-10T09:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const p = (params ?? {}) as Record<string, unknown>;
    const items = await projectList.execute({
      organizationSlug: p.organizationSlug,
      returnAll: true,
    }, ctx);
    return newRecords({
      state,
      items: Array.isArray(items) ? items : [],
      idOf: (item) => (item as { id?: unknown }).id,
    });
  },
};

export default trigger;
