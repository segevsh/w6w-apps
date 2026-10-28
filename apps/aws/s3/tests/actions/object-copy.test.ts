import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-copy.ts";

Deno.test("object-copy: PUTs the destination with x-amz-copy-source", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body:
        '<CopyObjectResult><ETag>"e1"</ETag><LastModified>2024-01-01T00:00:00.000Z</LastModified></CopyObjectResult>',
    },
  ]);
  const result = await action.execute!(
    {
      sourceBucket: "src-bucket",
      sourceKey: "a.txt",
      destinationBucket: "dst-bucket",
      destinationKey: "b.txt",
    },
    ctx,
  );

  assertEquals(calls[0].url, "https://s3.us-east-1.amazonaws.com/dst-bucket/b.txt");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].headers["x-amz-copy-source"], "/src-bucket/a.txt");
  assertEquals(result, { etag: '"e1"', lastModified: "2024-01-01T00:00:00.000Z" });
});

Deno.test("object-copy: sets x-amz-acl when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "<CopyObjectResult></CopyObjectResult>" }]);
  await action.execute!(
    {
      sourceBucket: "s",
      sourceKey: "a",
      destinationBucket: "d",
      destinationKey: "b",
      acl: "private",
    },
    ctx,
  );
  assertEquals(calls[0].headers["x-amz-acl"], "private");
});

Deno.test("object-copy: a 200 response carrying an <Error> body still throws", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: "<Error><Code>InternalError</Code><Message>mid-stream failure</Message></Error>",
    },
  ]);
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute!(
          { sourceBucket: "s", sourceKey: "a", destinationBucket: "d", destinationKey: "b" },
          ctx,
        ),
      ),
    Error,
    "mid-stream failure",
  );
});

Deno.test("object-copy: missing params reject", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute!(
          { sourceBucket: "", sourceKey: "a", destinationBucket: "d", destinationKey: "b" },
          ctx,
        ),
      ),
    Error,
    "sourceBucket",
  );
});
