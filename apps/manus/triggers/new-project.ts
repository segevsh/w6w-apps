import type { ActionDefinition } from "@w6w/types";
import { wholeListSnapshot } from "../lib/triggers.ts";
import projectList from "../actions/project-list.ts";

/** The vendor returns this list whole, unpaginated and unsorted, so it is diffed by id (added rows only). */
export default wholeListSnapshot({
  key: "new-project",
  title: "New Project",
  description: "The run gets each newly created project: id, name and creation time.",
  action: projectList as unknown as ActionDefinition,
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "number", label: "Created at (unix seconds)" },
  ],
  sample: { id: "project-1", name: "Q4 research", created_at: 1762765200 },
});
