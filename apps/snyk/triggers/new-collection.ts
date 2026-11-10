import { snykSnapshot } from "../lib/triggers.ts";
import action from "../actions/collection-list.ts";

/**
 * Bounded collection: an organization's project collections are curated groupings (`sort` offers only name/projectsCount/issues, no created stamp), so every check reads them all and emits ids not seen before.
 * (https://api.snyk.io/rest/openapi/2026-03-25 `GET /rest/orgs/{org_id}/collections`, verified 2026-11-10).
 */
export default snykSnapshot({
  key: "new-collection",
  title: "New Collection",
  description: "The run gets each collection newly created in the organization.",
  action,
  params: (action.params ?? []).filter((p) => ["orgId"].includes(p.key)),
  output: [
    { key: "id", type: "string", label: "Collection ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Collection attributes (name, is_generated)" },
  ],
  sample: {
    id: "e5f60718-0000-4000-8000-000000000005",
    type: "collection",
    attributes: { name: "Production", is_generated: false },
  },
});
