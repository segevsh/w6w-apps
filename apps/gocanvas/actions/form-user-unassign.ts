import type { ActionDefinition } from "@w6w/types";
import { deleted, encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  formId: number;
  userId: number;
}

const formUserUnassign: ActionDefinition<Input> = {
  key: "form-user-unassign",
  type: "perform",
  resource: "form",
  title: "Unassign User from Form",
  description:
    "Remove a user's assignment to a form. They can still finish submissions they already hold.",
  idempotent: true,
  params: [
    idParam("formId", "Form ID"),
    idParam("userId", "User ID"),
  ],
  output: [
    { key: "data", type: "object", label: "The API's confirmation" },
  ],

  async execute(input, ctx) {
    return deleted(
      await new GoCanvasClient(ctx).request(
        `/forms/${encodeId(input.formId)}/assigned_users/${encodeId(input.userId)}`,
        { method: "DELETE" },
      ),
    );
  },
};

export default formUserUnassign;
