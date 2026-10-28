import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-get.ts";

Deno.test("object-get: fetches the object and returns text content by default", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: "hello world",
      headers: {
        "content-type": "text/plain",
        "content-length": "11",
        etag: '"abc123"',
        "last-modified": "Mon, 01 Jan 2024 00:00:00 GMT",
      },
    },
  ]);
  const result = await action.execute!({ bucket: "my-bucket", key: "docs/a.txt" }, ctx);

  assertEquals(calls[0].url, "https://s3.us-east-1.amazonaws.com/my-bucket/docs/a.txt");
  assertEquals(result, {
    content: "hello world",
    encoding: "text",
    contentType: "text/plain",
    contentLength: 11,
    etag: '"abc123"',
    lastModified: "Mon, 01 Jan 2024 00:00:00 GMT",
  });
});

Deno.test("object-get: base64-encodes bytes exactly, including bytes >= 0x80", async () => {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]); // PNG-ish, includes high bytes
  const { ctx } = mockCtx([{ status: 200, body: bytes.buffer, headers: {} }]);
  const result = await action.execute!(
    { bucket: "my-bucket", key: "img.png", encoding: "base64" },
    ctx,
  );
  assertEquals(result.encoding, "base64");
  const decoded = Uint8Array.from(atob(result.content), (c) => c.charCodeAt(0));
  assertEquals(decoded, bytes);
});

Deno.test("object-get: encodes each path segment of the key independently", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "x", headers: {} }]);
  await action.execute!({ bucket: "my-bucket", key: "a folder/b file.txt" }, ctx);
  assertEquals(
    calls[0].url,
    "https://s3.us-east-1.amazonaws.com/my-bucket/a%20folder/b%20file.txt",
  );
});

Deno.test("object-get: appends versionId as a query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "x", headers: {} }]);
  await action.execute!({ bucket: "my-bucket", key: "a.txt", versionId: "v1" }, ctx);
  assertEquals(calls[0].url, "https://s3.us-east-1.amazonaws.com/my-bucket/a.txt?versionId=v1");
});

Deno.test("object-get: propagates NoSuchKey as an Error", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: "<Error><Code>NoSuchKey</Code><Message>not found</Message></Error>" },
  ]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ bucket: "my-bucket", key: "missing.txt" }, ctx)),
    Error,
    "not found",
  );
});

Deno.test("object-get: missing params reject", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ bucket: "", key: "a" }, ctx)),
    Error,
    "bucket",
  );
  await assertRejects(
    () => Promise.resolve(action.execute!({ bucket: "b", key: "" }, ctx)),
    Error,
    "key",
  );
});
