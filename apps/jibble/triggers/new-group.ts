import type { ActionDefinition } from "@w6w/types";
import { odataFeed } from "../lib/triggers.ts";
import groupList from "../actions/group-list.ts";

/** OData `$orderby` newest-first; `createdAt`/`updatedAt` are on the entity ($metadata, verified 2026-11-10). */
export default odataFeed({
  key: "new-group",
  title: "New Group",
  description: "The run gets each newly created group (team): id, name and timestamps.",
  action: groupList as ActionDefinition,
  orderBy: "createdAt desc",
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "group-1",
    name: "Field crew",
    status: "Active",
    createdAt: "2026-11-09T09:00:00Z",
    updatedAt: "2026-11-09T09:00:00Z",
  },
});
