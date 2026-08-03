import type { ActionDefinition } from "@w6w/types";
import { extractFormId, GoogleFormsClient } from "../lib/client.ts";

interface Input {
  formId: string;
}

/**
 * `forms.get` — GET /v1/forms/{formId}
 *
 * Returns the whole `Form`: info, settings, and every item. There is no field
 * mask or partial-response parameter on this method (the discovery document
 * lists `formId` as the only parameter), so the full document always comes
 * back.
 */
const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Fetch a form's metadata, settings and items.",
  params: [
    {
      key: "formId",
      label: "Form ID or URL",
      type: "string",
      required: true,
      hint: "A raw form ID, or the /forms/d/<id>/edit URL from your browser.",
    },
  ],
  output: [
    { key: "formId", type: "string", label: "Form ID" },
    { key: "info", type: "object", label: "Info (title, documentTitle, description)" },
    { key: "settings", type: "object", label: "Settings" },
    { key: "items", type: "array", label: "Items" },
    { key: "revisionId", type: "string", label: "Revision ID" },
    { key: "responderUri", type: "string", label: "Responder URI" },
    { key: "linkedSheetId", type: "string", label: "Linked Sheet ID" },
    { key: "publishSettings", type: "object", label: "Publish settings" },
  ],

  execute(input, ctx) {
    const client = new GoogleFormsClient(ctx);
    return client.request(`/forms/${encodeURIComponent(extractFormId(input.formId))}`);
  },
};

export default formGet;
