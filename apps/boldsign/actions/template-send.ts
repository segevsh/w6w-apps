import type { ActionDefinition } from "@w6w/types";
import { BoldSignClient, compact } from "../lib/client.ts";
import { templateIdParam } from "../lib/params.ts";

interface Input {
  templateId: string;
  roles: unknown;
  title?: string;
  message?: string;
  cc?: string[];
}

/**
 * `POST /v1/template/send` — copy a template into a new document and send it,
 * filling each of the template's roles (from `template-properties`) with a
 * real signer.
 *
 * `roles` is a JSON array of BoldSign `Role` objects — `roleIndex` (matching
 * a `template-properties` role's `index`), `signerName`, `signerEmail`, and
 * optionally per-role overrides (`signerOrder`, `authenticationType`, …).
 */
const templateSend: ActionDefinition<Input> = {
  key: "template-send",
  type: "perform",
  resource: "template",
  title: "Send Using Template",
  description: "Create and send a document from a template, filling its roles with real signers.",
  idempotent: false,
  params: [
    templateIdParam,
    {
      key: "roles",
      label: "Roles",
      type: "json",
      required: true,
      hint: 'Array of role objects, e.g. [{"roleIndex":1,"signerName":"Jane Doe",' +
        '"signerEmail":"jane@example.com"}]. Indices come from Get Template.',
    },
    { key: "title", label: "Title", type: "string", validation: { maxLength: 256 } },
    { key: "message", label: "Message", type: "text", validation: { maxLength: 5000 } },
    {
      key: "cc",
      label: "CC",
      type: "array",
      item: { type: "string", placeholder: "someone@example.com" },
      hint: "Email addresses to CC once the document is completed.",
    },
  ],
  output: [{ key: "documentId", type: "string", label: "Document ID" }],

  execute(input, ctx) {
    const cc = input.cc?.length
      ? input.cc.filter(Boolean).map((emailAddress) => ({ emailAddress }))
      : undefined;

    return new BoldSignClient(ctx).request("/template/send", {
      method: "POST",
      query: { templateId: input.templateId },
      body: compact({
        roles: input.roles,
        title: input.title,
        message: input.message,
        cc,
      }),
    });
  },
};

export default templateSend;
