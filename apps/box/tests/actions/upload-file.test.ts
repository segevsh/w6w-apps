import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upload-file.ts";

Deno.test("upload-file: POSTs to the upload host with a multipart body, attributes before file", async () => {
  const entries = { entries: [{ id: "1", name: "invoice.txt" }] };
  const { ctx, calls } = mockCtx([{ body: entries }]);
  const result = await action.execute!(
    { fileName: "invoice.txt", content: "hello world" },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://upload.box.com/api/2.0/files/content");
  assertEquals(calls[0].method, "POST");
  assert(calls[0].headers["content-type"].startsWith("multipart/form-data; boundary="));

  const body = calls[0].body!;
  const attributesIdx = body.indexOf('name="attributes"');
  const fileIdx = body.indexOf('name="file"');
  assert(attributesIdx >= 0 && fileIdx >= 0, "both parts present");
  assert(attributesIdx < fileIdx, "attributes part must precede the file part");
  assert(body.includes('"name":"invoice.txt"'));
  assert(body.includes('"parent":{"id":"0"}'));
  assert(body.includes("hello world"));
  assertEquals(result, entries);
});

Deno.test("upload-file: forwards a given parentId", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ fileName: "a.txt", content: "x", parentId: "42" }, ctx);
  assert(calls[0].body!.includes('"parent":{"id":"42"}'));
});
