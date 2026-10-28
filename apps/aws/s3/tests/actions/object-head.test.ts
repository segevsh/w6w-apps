import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-head.ts";

Deno.test("object-head: HEADs the object and returns metadata", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      headers: {
        "content-type": "text/plain",
        "content-length": "42",
        etag: '"abc"',
        "last-modified": "Mon, 01 Jan 2024 00:00:00 GMT",
      },
    },
  ]);
  const result = await action.execute!({ bucket: "b", key: "a.txt" }, ctx);

  assertEquals(calls[0].url, "https://s3.us-east-1.amazonaws.com/b/a.txt");
  assertEquals(calls[0].method, "HEAD");
  assertEquals(result, {
    exists: true,
    contentType: "text/plain",
    contentLength: 42,
    etag: '"abc"',
    lastModified: "Mon, 01 Jan 2024 00:00:00 GMT",
  });
});

Deno.test("object-head: reports exists:false on 404 without throwing", async () => {
  const { ctx } = mockCtx([{ status: 404 }]);
  const result = await action.execute!({ bucket: "b", key: "missing.txt" }, ctx);
  assertEquals(result, { exists: false });
});

Deno.test("object-head: other non-2xx statuses still throw", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ bucket: "b", key: "a.txt" }, ctx)),
    Error,
    "500",
  );
});

Deno.test("object-head: missing params reject", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ bucket: "", key: "a" }, ctx)),
    Error,
    "bucket",
  );
});
