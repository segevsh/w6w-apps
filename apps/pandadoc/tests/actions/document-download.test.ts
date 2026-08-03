import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/document-download.ts";

/** A tiny "PDF" with a high byte so the encoding is actually exercised. */
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0xff, 0x00]);
const PDF_B64 = "JVBERi0xLjT/AA==";

Deno.test("document-download: GETs /documents/{id}/download and base64-encodes the bytes", async () => {
  const { ctx, calls } = mockCtx([
    { body: PDF_BYTES, headers: { "content-type": "application/pdf" } },
  ]);
  const out = await action.execute({ documentId: "d1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/public/v1/documents/d1/download");
  assertEquals(out, {
    content: PDF_B64,
    encoding: "base64",
    contentType: "application/pdf",
  });
});

Deno.test("document-download: binary survives the round trip byte-for-byte", async () => {
  const { ctx } = mockCtx([{ body: PDF_BYTES, headers: { "content-type": "application/pdf" } }]);
  const out = await action.execute({ documentId: "d1" }, ctx);
  const decoded = Uint8Array.from(atob(out.content), (c) => c.charCodeAt(0));
  assertEquals(decoded, PDF_BYTES);
});

Deno.test("document-download: passes the watermark and separate_files params", async () => {
  const { ctx, calls } = mockCtx([
    { body: PDF_BYTES, headers: { "content-type": "application/zip" } },
  ]);
  const out = await action.execute({
    documentId: "d1",
    separateFiles: true,
    watermarkText: "DRAFT",
    watermarkColor: "#FF0000",
    watermarkFontSize: 42,
    watermarkOpacity: 0.5,
  }, ctx);

  const q = queryOf(calls[0]);
  assertEquals(q.get("separate_files"), "true");
  assertEquals(q.get("watermark_text"), "DRAFT");
  assertEquals(q.get("watermark_color"), "#FF0000");
  assertEquals(q.get("watermark_font_size"), "42");
  assertEquals(q.get("watermark_opacity"), "0.5");
  // separate_files changes the transport type — reported, not assumed.
  assertEquals(out.contentType, "application/zip");
});

Deno.test("document-download: sends no query when no options are set", async () => {
  const { ctx, calls } = mockCtx([{ body: PDF_BYTES }]);
  await action.execute({ documentId: "d1" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("document-download: falls back to application/pdf when no content-type comes back", async () => {
  const { ctx } = mockCtx([{ body: PDF_BYTES, headers: {} }]);
  const out = await action.execute({ documentId: "d1" }, ctx);
  assertEquals(out.contentType, "application/pdf");
});

Deno.test("document-download: is a read action — it has no side effects", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "document");
});
