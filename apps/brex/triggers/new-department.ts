import departmentList from "../actions/department-list.ts";
import { newRecordTrigger } from "../lib/snapshots.ts";

/**
 * `GET /v2/departments` lists a company's departments: a small directory with no sort or since filter, so every
 * check reads all of it (`limit` 1000, `cursor` paging) and diffs the ids.
 * https://developer.brex.com/openapi/team_api/departments/listdepartments.md (verified 2026-11-10)
 */
export default newRecordTrigger({
  key: "new-department",
  title: "New Department",
  description: "The run gets each department newly created in your Brex account.",
  action: departmentList,
  output: [
    { key: "id", type: "string", label: "Department ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "cudept_sample0001", name: "Sample Department" },
});
