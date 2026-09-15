import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, ParseurClient, toList } from "../lib/client.ts";
import { aiEngineOptions, allowedExtensionOptions } from "../lib/params.ts";

/**
 * `POST /parser` — create a new mailbox.
 *
 * The `Parser` object has well over 80 fields (whitelist/blacklist senders,
 * split-page rules, per-field export flags, ...); this action exposes the
 * handful a workflow most plausibly wants to set at creation time and offers
 * "Extra fields" as an escape hatch for the rest — passed through verbatim as
 * the vendor documents them, merged UNDER the named fields so a value typed
 * into a named field always wins over the same key repeated in Extra fields.
 */
interface Input {
  name?: string;
  aiEngine?: string;
  aiInstructions?: string;
  disableDeskew?: boolean;
  enableLayoutedText?: boolean;
  enableImageOcr?: boolean;
  allowedExtensions?: string[] | string;
  extra?: unknown;
}

const mailboxCreate: ActionDefinition<Input> = {
  key: "mailbox-create",
  type: "perform",
  resource: "mailbox",
  title: "Create Mailbox",
  description: "Create a new mailbox (parser).",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string" },
    {
      key: "aiEngine",
      label: "AI engine",
      type: "select",
      options: aiEngineOptions,
      hint: "Leave empty for Parseur's own default for new mailboxes.",
    },
    {
      key: "aiInstructions",
      label: "AI instructions",
      type: "text",
      hint: "General extraction instructions for the AI engine.",
    },
    {
      key: "disableDeskew",
      label: "Disable deskew",
      type: "boolean",
      hint: "Deskew (auto-straightening scanned pages) is enabled by default.",
    },
    { key: "enableLayoutedText", label: "Enable layouted text", type: "boolean" },
    {
      key: "enableImageOcr",
      label: "Enable image OCR",
      type: "boolean",
      hint: "Enabled by default; this only needs setting to turn it off.",
    },
    {
      key: "allowedExtensions",
      label: "Allowed file extensions",
      type: "multiselect",
      options: allowedExtensionOptions,
      hint: "Leave empty to accept every extension Parseur supports.",
    },
    {
      key: "extra",
      label: "Extra fields",
      type: "json",
      hint: "Any other Parser field from Parseur's API reference, as a JSON object. Named fields " +
        "above always take precedence over the same key repeated here.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Mailbox ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email_prefix", type: "string", label: "Email prefix" },
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
    return new ParseurClient(ctx).request("/parser", {
      method: "POST",
      body: { ...extra, ...named },
    });
  },
};

export default mailboxCreate;
