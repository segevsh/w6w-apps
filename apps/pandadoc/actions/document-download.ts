import type { ActionDefinition } from "@w6w/types";
import { PandaDocClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
  separateFiles?: boolean;
  watermarkText?: string;
  watermarkColor?: string;
  watermarkFontSize?: number;
  watermarkOpacity?: number;
}

interface Output {
  content: string;
  encoding: "base64";
  contentType: string;
}

/** base64 encode a byte array (no url-safe transformation). */
function encodeBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * `GET /public/v1/documents/{id}/download` — the document as a PDF.
 *
 * ## The response is bytes, not JSON
 *
 * This is the one endpoint in the app that does not answer `application/json`:
 * the reference documents a `200` of `application/pdf`, `"format": "binary"`,
 * and with `separate_files=true` a zip archive of PDFs instead.
 *
 * That is representable in this sandbox, but only one way. `ctx.fetch` returns
 * a real `Response`, so reading the bytes is fine — the constraint is the
 * *output* contract: an Action's return value has to survive JSON
 * serialization to cross the worker boundary and land in a workflow variable,
 * and `OutputField.type` has no blob or file member (`string | number |
 * boolean | object | array`). So the bytes are base64-encoded into a string,
 * with the transport `content-type` reported alongside so a consumer can tell a
 * PDF from a zip. This is the same shape `box/actions/download-file.ts` and
 * `dropbox/actions/download-file.ts` already use in this pack, deliberately —
 * a new convention for the same problem would be worse than a consistent one.
 *
 * Two honest caveats, both consequences of that encoding rather than defects:
 *
 *   - **Size.** base64 costs ~33% on top of the file, and the whole thing lives
 *     in memory and then in a workflow variable. Fine for a signed contract;
 *     not a way to move large archives. `separate_files` makes it bigger, not
 *     smaller.
 *   - **Rate limit.** PandaDoc buckets Download Document at 100 req/min,
 *     separately from the 2000 req/min list/status bucket — the tightest limit
 *     of anything this app calls (barring a sandbox key's blanket 10 req/min).
 *
 * PandaDoc also publishes a second, narrower route, Download Completed Document
 * (`/documents/{id}/download-protected`), for the countersigned/protected copy.
 * It is not exposed here: it applies only to completed documents and returns
 * the same binary, so it would add a second way to say the same thing.
 */
const documentDownload: ActionDefinition<Input, Output> = {
  key: "document-download",
  type: "read",
  resource: "document",
  title: "Download Document",
  description:
    "Download a document as a PDF, base64-encoded so the bytes survive JSON serialization. PandaDoc rate-limits this route at 100 requests/minute.",
  params: [
    documentIdParam,
    {
      key: "separateFiles",
      label: "Separate files",
      type: "boolean",
      hint:
        "Return each section as its own PDF inside a zip archive instead of one merged PDF. Sent as `separate_files`; changes the content type to a zip.",
    },
    {
      key: "watermarkText",
      label: "Watermark text",
      type: "string",
      hint: "Stamp this text across the PDF. Sent as `watermark_text`.",
    },
    {
      key: "watermarkColor",
      label: "Watermark colour",
      type: "string",
      hint: "HEX code, e.g. `#FF0000`. Sent as `watermark_color`.",
    },
    {
      key: "watermarkFontSize",
      label: "Watermark font size",
      type: "number",
      hint: "Sent as `watermark_font_size`.",
      validation: { min: 1, integer: true },
    },
    {
      key: "watermarkOpacity",
      label: "Watermark opacity",
      type: "number",
      hint: "0.0–1.0. Sent as `watermark_opacity`.",
      validation: { min: 0, max: 1 },
    },
  ],
  output: [
    { key: "content", type: "string", label: "Document bytes, base64-encoded" },
    { key: "encoding", type: "string", label: "Encoding — always `base64`" },
    {
      key: "contentType",
      type: "string",
      label: "Transport content type (application/pdf or a zip)",
    },
  ],

  async execute(input, ctx) {
    const res = await new PandaDocClient(ctx).request<Response>(
      `/documents/${encodeURIComponent(input.documentId)}/download`,
      {
        raw: true,
        query: {
          separate_files: input.separateFiles,
          watermark_text: input.watermarkText,
          watermark_color: input.watermarkColor,
          watermark_font_size: input.watermarkFontSize,
          watermark_opacity: input.watermarkOpacity,
        },
      },
    );
    const buf = new Uint8Array(await res.arrayBuffer());
    return {
      content: encodeBase64(buf),
      encoding: "base64",
      contentType: res.headers.get("content-type") ?? "application/pdf",
    };
  },
};

export default documentDownload;
