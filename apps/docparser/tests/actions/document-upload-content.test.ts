import { assert, assertEquals } from "@std/assert";
import documentUploadContent from "../../actions/document-upload-content.ts";
import { errorOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-upload-content: POSTs base64 content as a form to /v1/document/upload/<id>", async () => {
  const resp = { id: "doc1", file_size: 12, quota_used: 1, quota_left: 9, quota_refill: "x" };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const b64 = "JVBERi0+/w==";
  const out = await documentUploadContent.execute(
    { parserId: "p1", fileContent: b64, fileName: "a b.pdf", remoteId: "r" },
    ctx,
  );
  assertEquals(out, resp);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/document/upload/p1");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("file_content"), b64, "base64 +/= must survive form encoding");
  assertEquals(form.get("file_name"), "a b.pdf");
  assertEquals(form.get("remote_id"), "r");
});

Deno.test("document-upload-content: requires content, is not idempotent", async () => {
  assertEquals(documentUploadContent.idempotent, false);
  const { ctx, calls } = mockCtx([]);
  const err = await errorOf(() =>
    documentUploadContent.execute({ parserId: "p1", fileContent: "" }, ctx)
  );
  assert(err.message.includes("fileContent is required"));
  assertEquals(calls.length, 0);
});
