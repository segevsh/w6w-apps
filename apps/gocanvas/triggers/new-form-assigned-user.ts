import type { Param } from "@w6w/types";
import { requiredId, snapshotTrigger } from "../lib/triggers.ts";
import formAssignedUserList from "../actions/form-assigned-user-list.ts";

interface AssignedUser {
  id?: number | string;
}

const FORM: Param = {
  key: "formId",
  label: "Form ID",
  type: "string",
  required: true,
  hint: "The form to watch (Get Many Forms lists the ids).",
};

/**
 * One form's assigned users come back whole from `GET /forms/{id}/assigned_users` (no paging
 * parameter is documented); each check diffs the user ids against the previous check.
 */
const newFormAssignedUser = snapshotTrigger({
  key: "new-form-assigned-user",
  title: "User Assigned to Form",
  description:
    "The run gets each user newly assigned to the chosen form (Get Many Form Assigned Users).",
  params: [FORM],
  action: formAssignedUserList,
  input: (p) => ({ formId: requiredId(p, "formId", "Form ID") }),
  paged: false,
  idOf: (u) => String((u as AssignedUser).id ?? ""),
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: {
    id: 5486,
    type: "assigned_user",
    first_name: "Jane",
    last_name: "Doe",
    email: "jane.doe@gocanvas.com",
  },
});

export default newFormAssignedUser;
