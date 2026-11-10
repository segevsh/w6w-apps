import { snykSnapshot } from "../lib/triggers.ts";
import action from "../actions/group-list.ts";

/**
 * Bounded collection: `GET /rest/groups` lists the few groups the token belongs to and documents only paging, so every check reads them all and emits ids not seen before.
 * (https://api.snyk.io/rest/openapi/2026-03-25 `GET /rest/groups`, verified 2026-11-10).
 */
export default snykSnapshot({
  key: "new-group",
  title: "New Group",
  description: "The run gets each group newly visible to the token.",
  action,
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Group attributes (name, slug, created_at)" },
  ],
  sample: {
    id: "d4e5f607-0000-4000-8000-000000000004",
    type: "group",
    attributes: { name: "Acme Group", slug: "acme-group", created_at: "2026-11-09T09:00:00Z" },
  },
});
