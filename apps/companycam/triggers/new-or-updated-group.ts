import type { ActionDefinition } from "@w6w/types";
import groupList from "../actions/group-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// Same snapshot as `new-group`; a changed group (name, members) is an event too (brief 9.2).
export default snapshotTrigger<Record<string, never>>({
  key: "new-or-updated-group",
  title: "New or Updated Group",
  description: "The run gets each group that was created or changed.",
  action: groupList as unknown as ActionDefinition,
  input: () => ({}),
  updated: true,
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
