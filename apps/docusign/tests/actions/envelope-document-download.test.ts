import { assertEquals } from "@std/assert";
import { ACCOUNT_BASE, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action, { fileNameFrom } from "../../actions/envelope-document-download.ts";

/** A tiny "PDF" with a high byte so the encoding is actually exercised. */
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0xff, 0x00]);
const PDF_B64 = "JVBERi0xLjT/AA==";

Deno.test("envelope-document-download: GETs the document and base64-encodes the bytes", async () => {
  const { ctx, calls } = mockCtx([{
    body: PDF_BYTES,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'file; filename="NDA.pdf"; documentid="1"',
    },
  }]);
  const out = await action.execute({ envelopeId: "e1", documentId: "1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes/e1/documents/1`);
  assertEquals(out, {
    content: PDF_B64,
    encoding: "base64",
    contentType: "application/pdf",
    fileName: "NDA.pdf",
  });
});

Deno.test("envelope-document-download: binary survives the round trip byte-for-byte", async () => {
  const { ctx } = mockCtx([{ body: PDF_BYTES, headers: { "content-type": "application/pdf" } }]);
  const out = await action.execute({ envelopeId: "e1", documentId: "1" }, ctx);
  const decoded = Uint8Array.from(atob(out.content), (c) => c.charCodeAt(0));
  assertEquals(decoded, PDF_BYTES);
});

Deno.test("envelope-document-download: the keyword document ids pass through unmangled", async () => {
  const { ctx, calls } = mockCtx([{ body: PDF_BYTES }, { body: PDF_BYTES }, { body: PDF_BYTES }]);
  for (const id of ["combined", "archive", "certificate"]) {
    await action.execute({ envelopeId: "e1", documentId: id }, ctx);
  }
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes/e1/documents/combined`);
  assertEquals(pathOf(calls[1]), `${ACCOUNT_BASE}/envelopes/e1/documents/archive`);
  assertEquals(pathOf(calls[2]), `${ACCOUNT_BASE}/envelopes/e1/documents/certificate`);
});

Deno.test("envelope-document-download: defaults to the combined PDF", () => {
  assertEquals(action.params?.find((p) => p.key === "documentId")?.default, "combined");
});

Deno.test("envelope-document-download: sends the option flags and asks for any content type", async () => {
  const { ctx, calls } = mockCtx([{
    body: PDF_BYTES,
    headers: { "content-type": "application/zip" },
  }]);
  const out = await action.execute({
    envelopeId: "e1",
    documentId: "combined",
    certificate: true,
    showChanges: true,
    watermark: true,
    recipientId: "2",
    language: "fr",
  }, ctx);

  const q = queryOf(calls[0]);
  assertEquals(q.get("certificate"), "true");
  assertEquals(q.get("show_changes"), "true");
  assertEquals(q.get("watermark"), "true");
  assertEquals(q.get("recipient_id"), "2");
  assertEquals(q.get("language"), "fr");
  // The success body is a file, so a JSON-only Accept would be a lie.
  assertEquals(calls[0].headers["accept"], "*/*");
  // The transport type is reported, not assumed.
  assertEquals(out.contentType, "application/zip");
});

Deno.test("envelope-document-download: falls back to application/pdf when no content-type comes back", async () => {
  const { ctx } = mockCtx([{ body: PDF_BYTES, headers: {} }]);
  const out = await action.execute({ envelopeId: "e1", documentId: "1" }, ctx);
  assertEquals(out.contentType, "application/pdf");
  assertEquals(out.fileName, undefined);
});

Deno.test("fileNameFrom parses Docusign's non-standard Content-Disposition", () => {
  assertEquals(fileNameFrom('file; filename="NDA.pdf"; documentid="1"'), "NDA.pdf");
  assertEquals(fileNameFrom("attachment; filename=summary.zip"), "summary.zip");
  assertEquals(fileNameFrom("attachment"), undefined);
  assertEquals(fileNameFrom(null), undefined);
});

Deno.test("envelope-document-download: is a read action", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "document");
});
