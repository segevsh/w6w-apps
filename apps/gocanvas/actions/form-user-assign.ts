import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, GoCanvasClient } from "../lib/client.ts";
import { departmentIdParam, idParam } from "../lib/params.ts";

interface Input {
  formId: number;
  userId: number;
  departmentId?: number;
}

const formUserAssign: ActionDefinition<Input> = {
  key: "form-user-assign",
  type: "perform",
  resource: "form",
  title: "Assign User to Form",
  description: "Assign a user to a form so they can start submissions on it.",
  idempotent: true,
  params: [
    idParam("formId", "Form ID"),
    idParam("userId", "User ID"),
    departmentIdParam,
  ],
  output: [
    { key: "data", type: "object", label: "The assignment" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/forms/${encodeId(input.formId)}/assigned_users`, {
      method: "POST",
      body: compact({ user_id: input.userId, department_id: input.departmentId }),
    });
  },
};

export default formUserAssign;
