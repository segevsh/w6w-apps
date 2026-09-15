import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, ParseurClient, toList } from "../lib/client.ts";
import { aiEngineOptions, allowedExtensionOptions, mailboxIdParam } from "../lib/params.ts";

/**
 * `PUT /parser/{id}` — update a mailbox.
 *
 * Parseur documents this as a full `PUT`, but its own example only sends the
 * fields actually being changed (plus `id`), and every field is optional in
 * the schema — so this action only sends what the caller set, never a full
 * replacement of the other ~80 undeclared fields. See `mailbox-create.ts` for
 * why named fields win over the same key repeated in "Extra fields".
 *
 * `idempotent: true`: sending the same body twice leaves the mailbox in the
 * same state either time.
 */
interface Input {
  mailboxId: string;
  name?: string;
  aiEngine?: string;
  aiInstructions?: string;
  disableDeskew?: boolean;
  enableLayoutedText?: boolean;
  enableImageOcr?: boolean;
  allowedExtensions?: string[] | string;
  extra?: unknown;
}

const mailboxUpdate: ActionDefinition<Input> = {
  key: "mailbox-update",
  type: "perform",
  resource: "mailbox",
  title: "Update Mailbox",
  description: "Update a mailbox's configuration.",
  idempotent: true,
  params: [
    mailboxIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "aiEngine", label: "AI engine", type: "select", options: aiEngineOptions },
    { key: "aiInstructions", label: "AI instructions", type: "text" },
    { key: "disableDeskew", label: "Disable deskew", type: "boolean" },
    { key: "enableLayoutedText", label: "Enable layouted text", type: "boolean" },
    { key: "enableImageOcr", label: "Enable image OCR", type: "boolean" },
    {
      key: "allowedExtensions",
      label: "Allowed file extensions",
      type: "multiselect",
      options: allowedExtensionOptions,
    },
    {
      key: "extra",
      label: "Extra fields",
      type: "json",
      hint: "Any other Parser field, as a JSON object. Named fields above always win.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Mailbox ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extra, "Extra fields") ?? {};
    const named = compact({
      name: input.name,
      ai_engine: input.aiEngine,
      ai_instructions: input.aiInstructions,
      disable_deskew: input.disableDeskew,
      enable_layouted_text: input.enableLayoutedText,
      enable_image_ocr: input.enableImageOcr,
      allowed_extensions: toList(input.allowedExtensions),
    });
    return new ParseurClient(ctx).request(`/parser/${encodeId(input.mailboxId)}`, {
      method: "PUT",
      body: { ...extra, ...named },
    });
  },
};

export default mailboxUpdate;
