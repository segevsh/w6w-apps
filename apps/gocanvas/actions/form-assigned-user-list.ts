import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  formId: number;
}

const formAssignedUserList: ActionDefinition<Input> = {
  key: "form-assigned-user-list",
  type: "read",
  resource: "form",
  title: "List Form Assigned Users",
  description: "List the users a form is assigned to.",
  params: [
    idParam("formId", "Form ID"),
  ],
  output: [
    { key: "data", type: "array", label: "Assigned users" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/forms/${encodeId(input.formId)}/assigned_users`);
  },
};

export default formAssignedUserList;
