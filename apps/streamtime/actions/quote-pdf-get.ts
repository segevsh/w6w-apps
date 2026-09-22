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
 * `GET /quotes/{quote_id}/pdf` — the quote as a PDF.
 *
 * `application/pdf` bytes, so the response is base64-encoded into a string with
 * its transport content type reported alongside — the same shape `boldsign`,
 * `signnow` and `docusign` already use in this pack for a file-shaped response
 * crossing the worker boundary.
 */
interface Input {
  quoteId: number;
}

const quotePdfGet: ActionDefinition<Input, {
  content: string;
  encoding: "base64";
  contentType: string;
}> = {
  key: "quote-pdf-get",
  type: "read",
  resource: "quote",
  title: "Get Quote PDF",
  description: "Download a quote's PDF, base64-encoded.",
  params: [idParam("quoteId", "Quote ID")],
  output: [
    { key: "content", type: "string", label: "PDF bytes, base64-encoded" },
    { key: "encoding", type: "string", label: "Encoding — always `base64`" },
    { key: "contentType", type: "string", label: "Transport content type" },
  ],

  async execute(input, ctx) {
    const { bytes, contentType } = await new StreamtimeClient(ctx).bytes(
      `/quotes/${encodeId(input.quoteId)}/pdf`,
    );
    return {
      content: encodeBase64(bytes),
      encoding: "base64" as const,
      contentType: contentType || "application/pdf",
    };
  },
};

export default quotePdfGet;
