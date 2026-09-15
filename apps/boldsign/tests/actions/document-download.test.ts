import { assertEquals } from "@std/assert";
import documentDownload from "../../actions/document-download.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("document-download: base64-encodes the response bytes and reports content type", async () => {
  const bytes = new TextEncoder().encode("%PDF-1.4 fake pdf bytes");
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: bytes,
    headers: { "content-type": "application/pdf" },
  }]);
  const out = await documentDownload.execute({ documentId: "doc-1" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/document/download");
  assertEquals(queryOf(calls[0]).get("documentId"), "doc-1");
  assertEquals(out.encoding, "base64");
  assertEquals(out.contentType, "application/pdf");
  assertEquals(atob(out.content), "%PDF-1.4 fake pdf bytes");
});

Deno.test("document-download: forwards the optional format param", async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const { ctx, calls } = mockCtx([{ status: 200, body: bytes }]);
  await documentDownload.execute({ documentId: "doc-1", format: "Individually" }, ctx);
  assertEquals(queryOf(calls[0]).get("format"), "Individually");
});
