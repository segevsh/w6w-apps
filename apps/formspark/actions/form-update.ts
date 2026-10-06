import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient, seg } from "../lib/client.ts";
import {
  CLEARABLE,
  formBody,
  formFieldParams,
  type FormFields,
  formIdParam,
  formOutput,
} from "../lib/params.ts";

interface Input extends FormFields {
  formId: string;
  clearFields?: string[] | string;
}

/**
 * `PATCH /forms/{formId}` — "applies the fields you send and keeps the rest. Send `null` to
 * clear a field." Fields left blank here are therefore omitted, and `clearFields` names the
 * nullable ones to send as `null`. A name in `clearFields` wins over a value for the same field.
 * `notificationEmails`, when given, replaces the whole list.
 */
const formUpdate: ActionDefinition<Input> = {
  key: "form-update",
  type: "perform",
  resource: "form",
  title: "Update Form",
  description: "Change a form's settings. Only the fields you fill in change; use Clear Fields " +
    "to empty a setting. Requires forms:write on an upgraded workspace.",
  idempotent: true,
  params: [
    formIdParam,
    ...formFieldParams(false),
    {
      key: "clearFields",
      label: "Clear fields",
      type: "multiselect",
      options: CLEARABLE.map((value) => ({ value, label: value })),
      hint: "Settings to set to null (empty).",
    },
  ],
  output: formOutput,

  execute(input, ctx) {
    const body = formBody(input);
    const clear = Array.isArray(input.clearFields)
      ? input.clearFields
      : String(input.clearFields ?? "").split(",");
    for (const raw of clear) {
      const field = raw.trim();
      if (!field) continue;
      if (!(CLEARABLE as readonly string[]).includes(field)) {
        throw new Error(`Formspark: "${field}" cannot be cleared`);
      }
      body[field] = null;
    }
    return new FormsparkClient(ctx).request(`/forms/${seg(input.formId, "formId")}`, {
      method: "PATCH",
      body,
    });
  },
};

export default formUpdate;
