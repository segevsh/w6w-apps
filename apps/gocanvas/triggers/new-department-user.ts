import type { Param } from "@w6w/types";
import { requiredId, snapshotTrigger } from "../lib/triggers.ts";
import departmentUserList from "../actions/department-user-list.ts";

interface DepartmentUser {
  user?: { id?: number | string };
}

const DEPARTMENT: Param = {
  key: "departmentId",
  label: "Department ID",
  type: "string",
  required: true,
  hint: "The department to watch (Get Many Departments lists the ids).",
};

/**
 * One department's members come back whole from `GET /departments/{id}/users` (no paging
 * parameter is documented); each check diffs the member user ids against the previous check.
 */
const newDepartmentUser = snapshotTrigger({
  key: "new-department-user",
  title: "New Department Member",
  description:
    "The run gets each user who joins the chosen department (Get Many Department Users), with their department role.",
  params: [DEPARTMENT],
  action: departmentUserList,
  input: (p) => ({ departmentId: requiredId(p, "departmentId", "Department ID") }),
  paged: false,
  idOf: (m) => String((m as DepartmentUser).user?.id ?? ""),
  output: [
    { key: "user", type: "object", label: "The user (id, first_name, last_name, email, enabled)" },
    { key: "department_role", type: "string", label: "Department role" },
    { key: "created_at", type: "string", label: "Added at" },
  ],
  sample: {
    type: "department_user",
    user: {
      id: 5486,
      first_name: "Jane",
      last_name: "Doe",
      email: "jane.doe@gocanvas.com",
      enabled: true,
    },
    department_role: "department_user",
    created_at: "2022-09-13 17:02:49 UTC",
    updated_at: "2022-09-13 17:02:49 UTC",
  },
});

export default newDepartmentUser;
