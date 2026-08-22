import type { ActionDefinition } from "@w6w/types";
import { compact, DropboxSignClient } from "../lib/client.ts";

/**
 * `POST /embedded/edit_url/{template_id}` — verified against the official
 * OpenAPI document (`embeddedEditUrl`). Note it is a **POST**, unlike its
 * sibling `sign_url`, which is a GET.
 *
 * Returns the short-lived URL for editing an embedded template in your own
 * page. Same handling rule as the signing URL: it expires and it grants edit
 * access, so it is passed to a browser, not stored.
 */
const action: ActionDefinition = {
  key: "embedded-edit-url-get",
  type: "perform",
  resource: "embedded",
  title: "Get an embedded template edit URL",
  description: "Get the short-lived URL that lets a user edit a template inside your own page.",
  idempotent: true,
  params: [
    { key: "templateId", label: "Template ID", type: "string", required: true, default: "" },
    {
      key: "editorOptions",
      label: "Editor Options",
      type: "json",
      default: "",
      placeholder: '{"allow_edit_signers":true,"allow_edit_documents":false}',
      hint: "What the embedded editor may change.",
    },
    {
      key: "skipSignerRoles",
      label: "Skip Signer Roles",
      type: "boolean",
      default: false,
    },
    {
      key: "skipSubjectMessage",
      label: "Skip Subject & Message",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "edit_url", type: "string", label: "Edit URL — expires, and grants edit access" },
    { key: "expires_at", type: "number", label: "Expiry (Unix time)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.templateId ?? "").trim();
    if (!id) throw new Error("`templateId` is required");

    ctx.log("info", "getting a Dropbox Sign embedded edit URL", { templateId: id });

    const editorOptions = p.editorOptions ? JSON.parse(String(p.editorOptions)) : undefined;

    const res = await new DropboxSignClient(ctx).request<
      { embedded?: Record<string, unknown> }
    >(`/embedded/edit_url/${encodeURIComponent(id)}`, {
      method: "POST",
      body: compact({
        editor_options: editorOptions,
        skip_signer_roles: p.skipSignerRoles === true || undefined,
        skip_subject_message: p.skipSubjectMessage === true || undefined,
      }),
    });
    return res?.embedded;
  },
};

export default action;
