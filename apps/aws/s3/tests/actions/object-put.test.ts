import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-put.ts";

Deno.test("object-put: PUTs text content with the given content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, headers: { etag: '"e1"' } }]);
  const result = await action.execute!(
    { bucket: "my-bucket", key: "a.txt", content: "hello", contentType: "text/plain" },
    ctx,
  );

  assertEquals(calls[0].url, "https://s3.us-east-1.amazonaws.com/my-bucket/a.txt");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].body, "hello");
  assertEquals(calls[0].headers["content-type"], "text/plain");
  assertEquals(result.etag, '"e1"');
});

Deno.test("object-put: base64 content is decoded to a binary string body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, headers: {} }]);
  const b64 = btoa("hi"); // "aGk="
  await action.execute!(
    { bucket: "my-bucket", key: "a.bin", content: b64, encoding: "base64" },
    ctx,
  );
  assertEquals(calls[0].body, "hi");
});

Deno.test("object-put: sets x-amz-acl and x-amz-meta-* headers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, headers: {} }]);
  await action.execute!(
    {
      bucket: "my-bucket",
      key: "a.txt",
      content: "x",
      acl: "public-read",
      metadata: { Author: "james", "team-id": "42" },
    },
    ctx,
  );
  assertEquals(calls[0].headers["x-amz-acl"], "public-read");
  assertEquals(calls[0].headers["x-amz-meta-author"], "james");
  assertEquals(calls[0].headers["x-amz-meta-team-id"], "42");
});

Deno.test("object-put: reports the version id when versioning is enabled", async () => {
  const { ctx } = mockCtx([{ status: 200, headers: { "x-amz-version-id": "v123" } }]);
  const result = await action.execute!({ bucket: "b", key: "a.txt", content: "x" }, ctx);
  assertEquals(result.versionId, "v123");
});

Deno.test("object-put: propagates S3 errors", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: "<Error><Code>AccessDenied</Code><Message>denied</Message></Error>" },
  ]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ bucket: "b", key: "a.txt", content: "x" }, ctx)),
    Error,
    "denied",
  );
});

Deno.test("object-put: missing params reject", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ bucket: "", key: "a", content: "x" }, ctx)),
    Error,
    "bucket",
  );
  await assertRejects(
    () => Promise.resolve(action.execute!({ bucket: "b", key: "", content: "x" }, ctx)),
    Error,
    "key",
  );
});
