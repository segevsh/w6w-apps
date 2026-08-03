import type { ActionDefinition } from "@w6w/types";
import { compact, PandaDocClient } from "../lib/client.ts";

interface Input {
  name: string;
  templateUuid: string;
  recipients: unknown;
  tokens?: unknown;
  fields?: unknown;
  metadata?: unknown;
  tags?: unknown;
  pricingTables?: unknown;
  folderUuid?: string;
  owner?: unknown;
}

/**
 * `POST /public/v1/documents` — create a document from a template.
 *
 * ## This does not produce a sendable document
 *
 * PandaDoc's creation is **asynchronous**, and the response says so itself. A
 * 201 comes back with `status: "document.uploaded"` and an
 * `info_message: "Poll Document Status until status changes to document.draft"`
 * — the template merge happens in the background. Until the document reaches
 * `document.draft` it cannot be sent, and `document.error` is a real terminal
 * outcome for a merge that fails.
 *
 * So the honest shape of a create-and-send workflow is three steps, not two:
 *
 *   1. this action                  -> `document.uploaded`
 *   2. `document-get-status`, in a wait/retry loop, until `document.draft`
 *      (PandaDoc's guidance is 3–5 seconds; treat `document.error` as fatal)
 *   3. `document-send`
 *
 * This action deliberately does **not** poll on the caller's behalf. Sleeping
 * inside a hook burns a worker on wall-clock time the workflow engine already
 * knows how to wait for properly, and it would hide a `document.error` behind a
 * timeout. The polling belongs in the graph, where it is visible and
 * retry-policy applies to it.
 *
 * ## Template only
 *
 * The same endpoint also accepts a public PDF `url` instead of `template_uuid`,
 * and there is a separate multipart route for uploading a local file
 * (`/documents` with `multipart/form-data`). Only the template path is exposed
 * here: it is the one that composes with the rest of this app (a template's
 * roles and tokens are readable via `template-get`), whereas the upload route
 * needs multipart bodies whose parts a JSON-shaped param list cannot express.
 *
 * ## Structured params
 *
 * `recipients`, `tokens`, `fields`, `pricing_tables`, `metadata` and `owner`
 * are passed through as JSON rather than being flattened into scalar params.
 * Their shapes are genuinely nested (a recipient carries `delivery_methods` and
 * `verification_settings`; a pricing table carries sections carrying rows
 * carrying options) and PandaDoc extends them; re-modelling them here would
 * both grow stale and lose fields. The hints name the documented keys.
 */
const documentCreateFromTemplate: ActionDefinition<Input> = {
  key: "document-create-from-template",
  type: "perform",
  resource: "document",
  title: "Create Document from Template",
  description:
    "Create a document from a template. Creation is asynchronous — the document comes back as `document.uploaded` and must reach `document.draft` (poll Get Document Status) before it can be sent.",
  // PandaDoc mints a new document per POST and offers no idempotency key, so a
  // retry creates a second document.
  idempotent: false,
  params: [
    { key: "name", label: "Document name", type: "string", required: true },
    {
      key: "templateUuid",
      label: "Template UUID",
      type: "string",
      required: true,
      hint: "From Get Many Templates. Sent as `template_uuid`.",
    },
    {
      key: "recipients",
      label: "Recipients",
      type: "json",
      required: true,
      hint:
        'Array of recipients, e.g. [{"email":"a@b.com","first_name":"Ada","last_name":"L","role":"Client","signing_order":1}]. ' +
        "`role` must match a role defined on the template. Optional per-recipient keys: `phone`, " +
        "`delivery_methods` ({email, sms}) and `verification_settings`.",
    },
    {
      key: "tokens",
      label: "Tokens",
      type: "json",
      hint: 'Template variables, e.g. [{"name":"Client.Company","value":"Acme Corp"}].',
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      hint:
        'Pre-filled document fields keyed by field name, e.g. {"CustomerName":{"value":"Ada"}}.',
    },
    {
      key: "pricingTables",
      label: "Pricing tables",
      type: "json",
      hint:
        "Array of pricing tables with their sections, rows and options. Sent as `pricing_tables`.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint:
        'Arbitrary key/value pairs stored on the document, e.g. {"crm_deal_id":"1234"}. Searchable via the list endpoint.',
    },
    { key: "tags", label: "Tags", type: "json", hint: 'Array of strings, e.g. ["renewal","q3"].' },
    {
      key: "folderUuid",
      label: "Folder UUID",
      type: "string",
      hint: "Create the document inside this folder. Sent as `folder_uuid`.",
    },
    {
      key: "owner",
      label: "Owner",
      type: "json",
      hint:
        'Create on another member\'s behalf, e.g. {"email":"rep@acme.com"} or {"membership_id":"..."}.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "uuid", type: "string", label: "Document UUID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status — `document.uploaded` on creation" },
    { key: "date_created", type: "string", label: "Created at" },
    { key: "date_modified", type: "string", label: "Modified at" },
    { key: "links", type: "array", label: "Follow-up links (the status route)" },
    { key: "info_message", type: "string", label: "PandaDoc's own polling instruction" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating PandaDoc document from template", {
      templateUuid: input.templateUuid,
    });
    const body = compact({
      name: input.name,
      template_uuid: input.templateUuid,
      recipients: input.recipients,
      tokens: input.tokens,
      fields: input.fields,
      pricing_tables: input.pricingTables,
      metadata: input.metadata,
      tags: input.tags,
      folder_uuid: input.folderUuid,
      owner: input.owner,
    });
    return await new PandaDocClient(ctx).request("/documents", { method: "POST", body });
  },
};

export default documentCreateFromTemplate;
