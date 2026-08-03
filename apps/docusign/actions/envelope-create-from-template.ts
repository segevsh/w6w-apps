import type { ActionDefinition } from "@w6w/types";
import { compact, DocusignClient, jsonArray, jsonObject } from "../lib/client.ts";

interface Input {
  templateId: string;
  emailSubject?: string;
  emailBlurb?: string;
  status?: string;
  templateRoles: unknown;
  additionalFields?: unknown;
}

/**
 * `POST /restapi/v2.1/accounts/{accountId}/envelopes` — the same `Envelopes:
 * create` endpoint as `envelope-create`, driven by `templateId` +
 * `templateRoles` instead of inline documents.
 *
 * It is a separate action rather than a mode of one because the two shapes have
 * almost nothing in common at the form level: this one needs no documents at
 * all, and its recipients are *roles* (`roleName` matched against the template's
 * defined roles) rather than a full recipient structure. Collapsing them would
 * mean a form where most fields are inapplicable whichever way you use it.
 *
 * `emailSubject` is optional here — the template supplies one — which is the
 * other reason the two cannot share a param list.
 *
 * A `templateRoles` entry needs at least `roleName`, `email` and `name`. Setting
 * `clientUserId` on a role marks it an **embedded** signer: Docusign then sends
 * that person no email, and the signing URL must be minted with
 * `recipient-view-create`.
 *
 * **Not idempotent.** Every call creates a new envelope; Docusign offers no
 * idempotency key on this route.
 */
const envelopeCreateFromTemplate: ActionDefinition<Input> = {
  key: "envelope-create-from-template",
  type: "perform",
  resource: "envelope",
  title: "Create Envelope from Template",
  description:
    "Create an envelope from a Docusign template, filling its roles with real recipients, as a draft or sent immediately.",
  idempotent: false,
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "The template's GUID. Returned by List Templates.",
    },
    {
      key: "templateRoles",
      label: "Template roles",
      type: "json",
      required: true,
      hint:
        'JSON array of templateRole objects, e.g. [{"roleName":"Signer","email":"a@b.com","name":"A B"}]. Add "clientUserId" to make a role an embedded signer.',
    },
    {
      key: "emailSubject",
      label: "Email subject",
      type: "string",
      hint: "Overrides the template's subject. Leave blank to keep the template's own.",
    },
    { key: "emailBlurb", label: "Email message", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "created",
      options: [
        { value: "created", label: "Draft (created)" },
        { value: "sent", label: "Send immediately (sent)" },
      ],
      hint: "`sent` emails the recipients as soon as the envelope is created.",
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint:
        "JSON object merged into the envelopeDefinition — customFields, brandId, notification, eventNotification, etc.",
    },
  ],
  output: [
    { key: "envelopeId", type: "string", label: "Envelope ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "statusDateTime", type: "string", label: "Status at" },
    { key: "uri", type: "string", label: "Envelope URI" },
  ],

  execute(input, ctx) {
    const status = input.status ?? "created";
    const body = {
      ...jsonObject(input.additionalFields, "additionalFields"),
      ...compact({
        templateId: input.templateId,
        emailSubject: input.emailSubject,
        emailBlurb: input.emailBlurb,
        status,
      }),
      templateRoles: jsonArray(input.templateRoles, "templateRoles"),
    };
    ctx.log("info", "creating Docusign envelope from template", {
      templateId: input.templateId,
      status,
    });
    return new DocusignClient(ctx).request("/envelopes", { method: "POST", body });
  },
};

export default envelopeCreateFromTemplate;
