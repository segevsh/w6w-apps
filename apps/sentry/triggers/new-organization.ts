import type { TriggerDefinition } from "@w6w/types";
import organizationList from "../actions/organization-list.ts";
import { newRecords } from "../lib/triggers.ts";

/**
 * `GET /api/0/organizations/` lists the organizations the credential can see, cursor-paged, with no sort or date filter (https://docs.sentry.io/api/organizations/list-your-organizations/, verified 2026-11-10); a small bounded collection.
 * Every check reads the whole list through `organization-list` (`returnAll`) and diffs the ids
 * (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-organization",
  title: "New Organization",
  description: "The run gets each organization newly visible to the connected Sentry credential.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "name", type: "string", label: "Name" },
    { key: "dateCreated", type: "string", label: "Created at" },
  ],
  sample: { id: "2", slug: "acme", name: "Acme", dateCreated: "2026-11-10T09:00:00Z" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const items = await organizationList.execute({ returnAll: true }, ctx);
    return newRecords({
      state,
      items: Array.isArray(items) ? items : [],
      idOf: (item) => (item as { id?: unknown }).id,
    });
  },
};

export default trigger;
