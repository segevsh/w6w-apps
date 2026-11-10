import { snapshotTrigger } from "../lib/snapshot.ts";
import projectList from "../actions/project-list.ts";

/**
 * `GET /api/v2/projects` (https://axonaut.com/api/v2/doc, 2026-11-10) is served unordered and unfiltered, one page per `page`
 * header with no total, so each check reads every page and diffs the ids against the previous check (added only).
 */
export default snapshotTrigger({
  key: "new-project",
  title: "New Project",
  description: "The run gets each project newly created in Axonaut.",
  action: projectList as never,
  input: () => ({}),
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "number", type: "string", label: "Project number" },
    { key: "company_id", type: "number", label: "Company ID" },
  ],
  sample: { id: 5501, name: "Redesign delivery", number: "P-0007", company_id: 1042 },
});
