import type { ActionDefinition } from "@w6w/types";
import { encodeId, LexwareClient } from "../lib/client.ts";

/**
 * `GET /v1/<type>/{id}/file` — the rendered document as binary. The older `/document`
 * sub-resource (returns a `documentFileId`) is marked deprecated by the vendor and is not used.
 * A draft has no file (406/409). `Accept` chooses the representation: only an XRechnung invoice
 * has an XML form; everything else is PDF and a non-matching Accept is a 404/406.
 */
const TYPES = [
  "invoices",
  "quotations",
  "order-confirmations",
  "credit-notes",
  "delivery-notes",
  "dunnings",
  "down-payment-invoices",
] as const;

const ACCEPT = { any: "*/*", pdf: "application/pdf", xml: "application/xml" } as const;

interface Input {
  documentType: (typeof TYPES)[number];
  id: string;
  format?: keyof typeof ACCEPT;
}

const documentFileGet: ActionDefinition<Input> = {
  key: "document-file-get",
  type: "read",
  resource: "document",
  title: "Download Document File",
  description: "Download the rendered PDF (or XRechnung XML) of a finalized sales document as " +
    "base64. Drafts have no file.",
  params: [
    {
      key: "documentType",
      label: "Document type",
      type: "select",
      required: true,
      default: "invoices",
      options: TYPES.map((t) => ({ value: t, label: t })),
    },
    { key: "id", label: "Document id", type: "string", required: true },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "any",
      options: [
        { value: "any", label: "Default" },
        { value: "pdf", label: "PDF" },
        { value: "xml", label: "XML (XRechnung invoices only)" },
      ],
    },
  ],
  output: [
    { key: "contentType", type: "string", label: "MIME type" },
    { key: "fileName", type: "string", label: "Suggested file name" },
    { key: "size", type: "number", label: "Size in bytes" },
    { key: "base64", type: "string", label: "File content, base64" },
  ],
  async execute(input, ctx) {
    if (!TYPES.includes(input.documentType)) {
      throw new Error(`Document type must be one of ${TYPES.join(", ")}`);
    }
    const id = String(input.id ?? "").trim();
    if (!id) throw new Error("Document id is required");
    const accept = ACCEPT[input.format ?? "any"] ?? ACCEPT.any;
    return await new LexwareClient(ctx).file(
      `/${input.documentType}/${encodeId(id)}/file`,
      accept,
    );
  },
};

export default documentFileGet;
