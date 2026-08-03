import type { ActionDefinition } from "@w6w/types";
import { DocusignClient } from "../lib/client.ts";
import { envelopeIdParam } from "../lib/params.ts";

interface Input {
  envelopeId: string;
  documentId: string;
  certificate?: boolean;
  showChanges?: boolean;
  watermark?: boolean;
  recipientId?: string;
  language?: string;
}

interface Output {
  content: string;
  encoding: "base64";
  contentType: string;
  fileName?: string;
}

/** base64 encode a byte array (no url-safe transformation). */
function encodeBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * Docusign puts the file name in the `Content-Disposition` header, in the
 * slightly non-standard form `file; filename="NDA.pdf"; documentid="1"`. Both
 * quoted and bare values appear in the wild, so both are accepted.
 */
export function fileNameFrom(disposition: string | null): string | undefined {
  if (!disposition) return undefined;
  const m = /filename\*?=(?:"([^"]*)"|([^;]+))/i.exec(disposition);
  const value = (m?.[1] ?? m?.[2])?.trim();
  return value || undefined;
}

/**
 * `GET /restapi/v2.1/accounts/{accountId}/envelopes/{envelopeId}/documents/{documentId}`
 * — `EnvelopeDocuments: get`.
 *
 * ## The response is bytes, not JSON
 *
 * Docusign answers with the file itself: `application/pdf` for a single
 * document, a PDF portfolio, or `application/zip` for the `archive` keyword.
 * An Action's return value has to survive JSON serialization to cross the
 * worker boundary, and `OutputField.type` has no blob member — so the bytes are
 * base64-encoded into a string with the transport content type reported
 * alongside, the same shape `pandadoc`, `box` and `dropbox` already use in this
 * pack. base64 costs ~33% on top of the file, and the whole thing lives in
 * memory; fine for a signed contract, not a way to move large archives.
 *
 * ## The four keyword document IDs are the point
 *
 * `documentId` takes a real document id (`1`, `2`, …, from
 * `envelope-document-list`) *or* one of Docusign's documented keywords, which is
 * how you get the whole envelope in one call:
 *
 *   - `combined` — every document merged into one PDF. Set **Include
 *     certificate** to append the certificate of completion.
 *   - `archive` — a ZIP of all PDFs plus the certificate.
 *   - `certificate` — the certificate of completion alone.
 *   - `portfolio` — the documents as a PDF portfolio.
 *
 * `certificate` as a *query* flag applies only when `documentId` is `combined`;
 * Docusign ignores it otherwise.
 *
 * ## Rate limits
 *
 * Docusign meters GET requests per envelope per hour and in 30-second bursts,
 * and enforces separate limits on concurrent download requests for the same
 * document. Downloading the same envelope in a tight loop is the fastest way to
 * a `Burst_Envelope_Polling_Limit_Exceeded`.
 */
const envelopeDocumentDownload: ActionDefinition<Input, Output> = {
  key: "envelope-document-download",
  type: "read",
  resource: "document",
  title: "Download Envelope Document",
  description:
    "Download one document, the combined PDF, the certificate of completion or a ZIP archive from an envelope, base64-encoded.",
  params: [
    envelopeIdParam,
    {
      key: "documentId",
      label: "Document ID",
      type: "string",
      required: true,
      default: "combined",
      hint:
        "A document id from List Envelope Documents, or a keyword: `combined` (all documents as one PDF), `archive` (ZIP of all PDFs + certificate), `certificate` (certificate of completion only), `portfolio` (PDF portfolio).",
    },
    {
      key: "certificate",
      label: "Include certificate",
      type: "boolean",
      default: false,
      hint: "Append the certificate of completion. Only applies when Document ID is `combined`.",
    },
    {
      key: "showChanges",
      label: "Show changes",
      type: "boolean",
      hint:
        "Highlight changed fields in yellow and outline optional signatures in red. Requires the account's Highlight Data Changes feature.",
    },
    {
      key: "watermark",
      label: "Watermark",
      type: "boolean",
      hint: "Apply the account watermark to an incomplete envelope's documents.",
    },
    {
      key: "recipientId",
      label: "Recipient ID",
      type: "string",
      hint: "Retrieve the documents as one of the recipients the sender controls.",
    },
    {
      key: "language",
      label: "Certificate language",
      type: "string",
      hint:
        "Language of the certificate of completion, e.g. `en`, `fr`, `de`, `ja`, `zh_CN`. Ignored for ordinary documents.",
    },
  ],
  output: [
    { key: "content", type: "string", label: "Document bytes, base64-encoded" },
    { key: "encoding", type: "string", label: "Encoding — always `base64`" },
    { key: "contentType", type: "string", label: "Transport content type (PDF or ZIP)" },
    { key: "fileName", type: "string", label: "File name from Content-Disposition" },
  ],

  async execute(input, ctx) {
    const res = await new DocusignClient(ctx).request<Response>(
      `/envelopes/${encodeURIComponent(input.envelopeId)}/documents/${
        encodeURIComponent(input.documentId)
      }`,
      {
        raw: true,
        // Docusign returns JSON errors on this route but a file on success, so
        // the client's default `accept: application/json` would be a lie.
        headers: { accept: "*/*" },
        query: {
          certificate: input.certificate,
          show_changes: input.showChanges,
          watermark: input.watermark,
          recipient_id: input.recipientId,
          language: input.language,
        },
      },
    );
    const buf = new Uint8Array(await res.arrayBuffer());
    return {
      content: encodeBase64(buf),
      encoding: "base64",
      contentType: res.headers.get("content-type") ?? "application/pdf",
      fileName: fileNameFrom(res.headers.get("content-disposition")),
    };
  },
};

export default envelopeDocumentDownload;
