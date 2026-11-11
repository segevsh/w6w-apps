import type { ActionDefinition } from "@w6w/types";
import projectList from "../actions/project-list.ts";
import { numbered, secondsMs, sinceFilterTrigger } from "../lib/triggers.ts";

// `GET /v2/projects` takes `modified_since` (ISO 8601, 'modified on or after'): a since-filter
// poll (brief 9.1b). A project edited after the seed but created before it is dropped by the seed
// floor (brief 9.9). Doc: https://docs.companycam.com/reference/listprojects
export default sinceFilterTrigger({
  key: "new-project",
  title: "New Project",
  description: "The run gets each newly created project.",
  overlapMs: 600_000,
  load: numbered(
    projectList as unknown as ActionDefinition,
    (_p, from) => ({ modifiedSince: new Date(from ?? 0).toISOString() }),
  ),
  idOf: (item) => String(item.id ?? ""),
  tsOf: (item) => secondsMs(item.created_at),
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created (Unix seconds)" },
  ],
  sample: {
    id: "5001",
    name: "Smith roof",
    status: "active",
    created_at: 1762646400,
    updated_at: 1762646400,
  },
});
