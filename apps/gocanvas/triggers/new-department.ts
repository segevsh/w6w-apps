import { snapshotTrigger } from "../lib/triggers.ts";
import departmentList from "../actions/department-list.ts";

interface Department {
  id?: number | string;
}

/**
 * Departments come back whole from `GET /departments` (no paging parameter is documented), so
 * each check diffs the ids against the previous check.
 */
const newDepartment = snapshotTrigger({
  key: "new-department",
  title: "New Department",
  description: "The run gets each department that appears in the company department list.",
  action: departmentList,
  paged: false,
  idOf: (d) => String((d as Department).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Department ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 111,
    type: "department",
    name: "First Department",
    description: "My first department",
    created_at: "2023-05-31 15:34:47 UTC",
  },
});

export default newDepartment;
