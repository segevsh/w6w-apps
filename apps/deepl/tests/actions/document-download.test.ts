import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-download.ts";
import { base64ToBytes } from "../../lib/client.ts";

Deno.test("document-download: POSTs document_key and base64-encodes the binary body", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: "raw-bytes",
      headers: { "content-type": "application/pdf" },
    },
  ]);
  const result = await action.execute!(
    { documentId: "doc-1", documentKey: "key-1" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/document/doc-1/result");
  assertEquals(JSON.parse(calls[0].body!), { document_key: "key-1" });
  assertEquals(result.contentType, "application/pdf");
  const decoded = new TextDecoder().decode(base64ToBytes(result.fileBase64));
  assertEquals(decoded, "raw-bytes");
});
