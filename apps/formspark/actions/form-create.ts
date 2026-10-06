import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient, need } from "../lib/client.ts";
import {
  formBody,
  formFieldParams,
  type FormFields,
  formOutput,
  workspaceIdParam,
} from "../lib/params.ts";

interface Input extends FormFields {
  workspaceId: string;
  name: string;
}

/**
 * `POST /forms` — create a form. Not idempotent: "a repeated POST creates a second form".
 * A free workspace is capped at 10 forms and an upgraded one at 100 (`403 quota_exceeded`).
 */
const formCreate: ActionDefinition<Input> = {
  key: "form-create",
  type: "perform",
  resource: "form",
  title: "Create Form",
  description: "Create a form in a workspace. The returned `id` is the form's submit-form.com " +
    "endpoint id. Requires an upgraded workspace and forms:write.",
  idempotent: false,
  params: [workspaceIdParam(), ...formFieldParams(true)],
  output: formOutput,

  execute(input, ctx) {
    return new FormsparkClient(ctx).request("/forms", {
      method: "POST",
      body: { workspaceId: need(input.workspaceId, "workspaceId"), ...formBody(input) },
    });
  },
};

export default formCreate;
