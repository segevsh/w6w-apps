import { snykSnapshot } from "../lib/triggers.ts";
import action from "../actions/org-list.ts";

/**
 * Bounded collection: `GET /rest/orgs` lists the organizations the token reaches (optionally one group's) and documents no created filter or sort, so every check reads them all and emits ids not seen before.
 * (https://api.snyk.io/rest/openapi/2026-03-25 `GET /rest/orgs`, verified 2026-11-10).
 */
export default snykSnapshot({
  key: "new-organization",
  title: "New Organization",
  description: "The run gets each organization newly created in the group.",
  action,
  params: (action.params ?? []).filter((p) => ["groupId"].includes(p.key)),
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "type", type: "string", label: "Resource type" },
    {
      key: "attributes",
      type: "object",
      label: "Organization attributes (name, slug, group_id, created_at)",
    },
  ],
  sample: {
    id: "c3d4e5f6-0000-4000-8000-000000000003",
    type: "org",
    attributes: {
      name: "Acme",
      slug: "acme",
      group_id: "d4e5f607-0000-4000-8000-000000000004",
      created_at: "2026-11-09T09:00:00Z",
    },
  },
});
