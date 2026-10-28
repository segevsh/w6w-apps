/**
 * Builds a `multipart/form-data` body as raw bytes.
 *
 * Zoho Sign's document/template creation endpoints take a `file` part (the PDF/Word/etc. to
 * sign) alongside a `data` part (the JSON envelope, sent as plain text — Zoho Sign does NOT
 * want it URL-encoded here, unlike `submit`/`update`, which do — see `client.ts`). Splicing
 * the file's own bytes in between two UTF-8-encoded text halves keeps binary content intact
 * end to end, mirroring this pack's `box` app's `upload-file.ts` — this app's `ctx.fetch` no
 * longer coerces a `Uint8Array` body to a string on its way to the network.
 */
const BOUNDARY = "w6wZohoSignBoundary5c8f2ad1";

function escapeHeaderValue(value: string): string {
  return value.replace(/["\\\r\n]/g, "");
}

export interface MultipartFile {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
}

export function buildMultipart(
  fields: Record<string, string>,
  file?: MultipartFile,
): { body: Uint8Array; contentType: string } {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];

  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      encoder.encode(
        `--${BOUNDARY}\r\n` +
          `Content-Disposition: form-data; name="${escapeHeaderValue(name)}"\r\n\r\n` +
          `${value}\r\n`,
      ),
    );
  }

  if (file) {
    parts.push(
      encoder.encode(
        `--${BOUNDARY}\r\n` +
          `Content-Disposition: form-data; name="file"; filename="${
            escapeHeaderValue(file.filename)
          }"\r\n` +
          `Content-Type: ${escapeHeaderValue(file.contentType)}\r\n\r\n`,
      ),
    );
    parts.push(file.bytes);
    parts.push(encoder.encode(`\r\n`));
  }

  parts.push(encoder.encode(`--${BOUNDARY}--\r\n`));

  const total = parts.reduce((n, p) => n + p.length, 0);
  const body = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    body.set(p, offset);
    offset += p.length;
  }
  return { body, contentType: `multipart/form-data; boundary=${BOUNDARY}` };
}
