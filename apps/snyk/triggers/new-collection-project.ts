import { snykSnapshot } from "../lib/triggers.ts";
import action from "../actions/collection-project-list.ts";

/**
 * Per-parent list where the user picks the collection (required `collectionId` param): a collection is a curated set, so every check reads its membership and emits project ids not seen before.
 * (https://api.snyk.io/rest/openapi/2026-03-25 `GET /rest/orgs/{org_id}/collections/{collection_id}/relationships/projects`, verified 2026-11-10).
 */
export default snykSnapshot({
  key: "new-collection-project",
  title: "New Project in Collection",
  description: "The run gets each project newly added to the chosen collection.",
  action,
  params: (action.params ?? []).filter((p) => ["orgId", "collectionId"].includes(p.key)),
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "type", type: "string", label: "Resource type" },
  ],
  sample: { id: "f6071829-0000-4000-8000-000000000006", type: "project" },
});
