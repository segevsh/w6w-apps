import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** base64 encode a byte array (no url-safe transformation). */
function encodeBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * `GET /invoices/{invoice_id}/pdf` — the invoice as a PDF, base64-encoded the
 * same way `quote-pdf-get` does it.
 */
interface Input {
  invoiceId: number;
}

const invoicePdfGet: ActionDefinition<Input, {
  content: string;
  encoding: "base64";
  contentType: string;
}> = {
  key: "invoice-pdf-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice PDF",
  description: "Download an invoice's PDF, base64-encoded.",
  params: [idParam("invoiceId", "Invoice ID")],
  output: [
    { key: "content", type: "string", label: "PDF bytes, base64-encoded" },
    { key: "encoding", type: "string", label: "Encoding — always `base64`" },
    { key: "contentType", type: "string", label: "Transport content type" },
  ],

  async execute(input, ctx) {
    const { bytes, contentType } = await new StreamtimeClient(ctx).bytes(
      `/invoices/${encodeId(input.invoiceId)}/pdf`,
    );
    return {
      content: encodeBase64(bytes),
      encoding: "base64" as const,
      contentType: contentType || "application/pdf",
    };
  },
};

export default invoicePdfGet;
