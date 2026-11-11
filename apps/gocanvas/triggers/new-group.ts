import type { Param } from "@w6w/types";
import { requiredId, snapshotTrigger } from "../lib/triggers.ts";
import groupList from "../actions/group-list.ts";

interface Group {
  id?: number | string;
}

const DEPARTMENT: Param = {
  key: "departmentId",
  label: "Department ID",
  type: "string",
  hint:
    "The department whose groups to watch. Required when Departments are enabled for the company; otherwise the user's default department is used.",
};

/**
 * Groups are read whole (`GET /groups?department_id=`, pages of 100, no sort or created filter
 * documented), so each check diffs the ids against the previous check.
 */
const newGroup = snapshotTrigger({
  key: "new-group",
  title: "New Group",
  description: "The run gets each group that appears in the chosen department's group list.",
  params: [DEPARTMENT],
  action: groupList,
  input: (p) =>
    String(p?.departmentId ?? "").trim() === ""
      ? {}
      : { departmentId: requiredId(p, "departmentId", "Department ID") },
  paged: true,
  idOf: (g) => String((g as Group).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "department_id", type: "number", label: "Department ID" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 1873,
    type: "group",
    department_id: 21474,
    created_at: "2025-06-04T00:12:02Z",
    name: "Inspectors",
    description: "Common tasks for inspectors",
  },
});

export default newGroup;
