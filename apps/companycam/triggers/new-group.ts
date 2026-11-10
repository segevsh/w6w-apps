import type { ActionDefinition } from "@w6w/types";
import groupList from "../actions/group-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/groups` lists the company's user groups, a small bounded collection, so each check
// snapshots all pages (brief 9.1c).
export default snapshotTrigger<Record<string, never>>({
  key: "new-group",
  title: "New Group",
  description: "The run gets each newly created group.",
  action: groupList as unknown as ActionDefinition,
  input: () => ({}),
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created (Unix seconds)" },
  ],
  sample: {
    id: "3001",
    name: "Crew A",
    status: "active",
    created_at: 1762646400,
    updated_at: 1762646400,
  },
});
