import type { ActionDefinition } from "@w6w/types";
import { GoogleFormsClient } from "../lib/client.ts";

interface Input {
  title: string;
  documentTitle?: string;
  unpublished?: boolean;
}

/**
 * `forms.create` — POST /v1/forms
 *
 * Google copies **only** `info.title` and `info.documentTitle` from the request
 * body onto the new form; a description or items sent here are silently
 * dropped. Everything else is a follow-up `:batchUpdate`, which is why this
 * action deliberately exposes nothing but the two titles.
 *
 * `documentTitle` is marked output-only on the `Info` schema, but `forms.create`
 * documents it as one of the two copied fields — create is the one place it is
 * writable. After creation it can only change via Drive's file rename.
 */
const formCreate: ActionDefinition<Input> = {
  key: "form-create",
  type: "perform",
  resource: "form",
  title: "Create Form",
  description: "Create a new Google Form with a title (and optional Drive document title).",
  idempotent: false,
  params: [
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      hint: "The form title shown to responders.",
    },
    {
      key: "documentTitle",
      label: "Document Title",
      type: "string",
      hint:
        "The name of the file in Drive. Writable only at creation time; afterwards rename the file in Drive.",
    },
    {
      key: "unpublished",
      label: "Create Unpublished",
      type: "boolean",
      hint:
        "When true the form does not accept responses. Forms created through the API after 2026-06-30 are unpublished by default.",
    },
  ],
  output: [
    { key: "formId", type: "string", label: "Form ID" },
    { key: "info", type: "object", label: "Info (title, documentTitle, description)" },
    { key: "responderUri", type: "string", label: "Responder URI" },
    { key: "revisionId", type: "string", label: "Revision ID" },
    { key: "settings", type: "object", label: "Settings" },
  ],

  execute(input, ctx) {
    const client = new GoogleFormsClient(ctx);
    const info: Record<string, unknown> = { title: input.title };
    if (input.documentTitle) info.documentTitle = input.documentTitle;
    return client.request("/forms", {
      method: "POST",
      query: { unpublished: input.unpublished },
      body: { info },
    });
  },
};

export default formCreate;
