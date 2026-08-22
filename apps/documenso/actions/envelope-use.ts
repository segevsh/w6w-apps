import type { ActionDefinition } from "@w6w/types";
import { compact, DocumensoClient, json } from "../lib/client.ts";

/**
 * `POST /envelope/use` — verified against Documenso's v2 OpenAPI document.
 *
 * **This is how a workflow creates something to sign.** Creating an envelope
 * from scratch (`POST /envelope/create`) requires uploading a PDF as
 * `multipart/form-data`, and an App runs in a sandbox with no local file to
 * attach — so the template route is the one that works, and it is the better
 * pattern anyway: the document is authored and versioned in Documenso rather
 * than assembled by a workflow step.
 *
 * The request is still `multipart/form-data`, but the `files` part is optional
 * — this app sends only the JSON `payload` field, which replaces nothing and
 * uses the template's own PDFs. The content-type header is deliberately left to
 * the runtime, because a multipart body needs a boundary that a hand-written
 * header would not have.
 *
 * **Recipients are matched by the template's numeric placeholder id**, not by
 * role name or position: each entry needs `{id, email}`. `envelope-get` on the
 * template shows the ids.
 *
 * `distributeDocument` sends it immediately, collapsing this and
 * `envelope-distribute` into one call — which is convenient and worth being
 * deliberate about, since it is the difference between a draft and a contract
 * in someone's inbox.
 */
const action: ActionDefinition = {
  key: "envelope-use",
  type: "perform",
  resource: "envelope",
  title: "Create an envelope from a template",
  description:
    "Fill a template envelope's recipients and create a real one, optionally sending it.",
  // Two calls create two envelopes.
  idempotent: false,
  params: [
    {
      key: "envelopeId",
      label: "Template Envelope ID",
      type: "string",
      required: true,
      default: "",
      hint: "The TEMPLATE envelope to use, not the one being created.",
    },
    {
      key: "recipients",
      label: "Recipients",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"id":1,"email":"ada@example.com","name":"Ada Lovelace"}]',
      hint: "Each entry maps a template placeholder by its numeric `id`. Both `id` and `email` " +
        "are required — a name or a role will not match.",
    },
    {
      key: "distributeDocument",
      label: "Send Immediately",
      type: "boolean",
      default: false,
      hint: "On, this creates AND emails it in one call. Off leaves a draft for you to check " +
        "before Distribute.",
    },
    { key: "externalId", label: "External ID", type: "string", default: "" },
    {
      key: "prefillFields",
      label: "Prefill Fields",
      type: "json",
      default: "",
      hint: "Values to place into the template's fields before sending.",
    },
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      default: "",
      hint: "Where the new envelope is filed.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "The new envelope's id" },
    { key: "status", type: "string", label: "DRAFT unless it was sent immediately" },
    { key: "recipients", type: "array", label: "Recipients as created" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const envelopeId = String(p.envelopeId ?? "").trim();
    if (!envelopeId) throw new Error("`envelopeId` is required — the template to use");

    const recipients = json(p.recipients, "recipients");
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error("`recipients` is required — a non-empty array of `{id, email}` objects");
    }
    for (const [i, raw] of recipients.entries()) {
      const r = raw as Record<string, unknown>;
      if (r?.id === undefined || r.id === null || r.id === "") {
        throw new Error(
          `recipient ${i} has no \`id\` — a template maps its placeholders by numeric id, not ` +
            "by name or position",
        );
      }
      if (!String(r?.email ?? "").trim()) throw new Error(`recipient ${i} has no \`email\``);
    }

    const distribute = p.distributeDocument === true;
    const payload = compact({
      envelopeId,
      recipients,
      externalId: p.externalId,
      prefillFields: json(p.prefillFields, "prefillFields"),
      folderId: p.folderId,
    });
    payload.distributeDocument = distribute;

    ctx.log(distribute ? "warn" : "info", "creating a Documenso envelope from a template", {
      templateId: envelopeId,
      recipients: recipients.length,
      sending: distribute,
    });

    return await new DocumensoClient(ctx).request("/envelope/use", {
      method: "POST",
      body: payload,
      asFormPayload: true,
    });
  },
};

export default action;
