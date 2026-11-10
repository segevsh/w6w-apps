import type { ActionDefinition } from "@w6w/types";
import projectList from "../actions/project-list.ts";
import { numbered, secondsMs, sinceFilterTrigger } from "../lib/triggers.ts";

// Same `modified_since` window as `new-project`; the id carries `updated_at` so an edit is a new
// event (brief 9.2).
export default sinceFilterTrigger({
  key: "new-or-updated-project",
  title: "New or Updated Project",
  description: "The run gets each project that was created or modified.",
  overlapMs: 600_000,
  load: numbered(
    projectList as unknown as ActionDefinition,
    (_p, from) => ({ modifiedSince: new Date(from ?? 0).toISOString() }),
  ),
  idOf: (item) => `${item.id ?? ""}:${item.updated_at ?? ""}`,
  tsOf: (item) => secondsMs(item.updated_at),
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
