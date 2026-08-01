import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/translate-document.ts";
import { bytesToBase64 } from "../../lib/client.ts";

Deno.test("translate-document: POSTs multipart/form-data to /v2/document", async () => {
  const body = { document_id: "doc-1", document_key: "key-1" };
  const { ctx, calls } = mockCtx([{ body }], { display: { plan: "pro" } });
  const fileBase64 = bytesToBase64(new Uint8Array([1, 2, 3]));

  const result = await action.execute!(
    {
      file: `data:application/pdf;base64,${fileBase64}`,
      filename: "doc.pdf",
      targetLang: "DE",
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/document");
  assertEquals(calls[0].method, "POST");
  // multipart bodies are not JSON — just confirm no JSON content-type header was forced.
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(result, { documentId: "doc-1", documentKey: "key-1" });
});

Deno.test("translate-document: decodes a data: URL's MIME type over an explicit mimeType param", async () => {
  const body = { document_id: "doc-1", document_key: "key-1" };
  const { ctx } = mockCtx([{ body }]);
  const fileBase64 = bytesToBase64(new Uint8Array([9]));
  const result = await action.execute!(
    {
      file: `data:image/png;base64,${fileBase64}`,
      filename: "x.png",
      mimeType: "application/octet-stream",
      targetLang: "EN",
    },
    ctx,
  );
  assertEquals(result.documentId, "doc-1");
});
