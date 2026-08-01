import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bucket-delete.ts";

Deno.test("bucket-delete: DELETEs the bucket and reports deleted:true on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ bucket: "my-bucket" }, ctx);

  assertEquals(calls[0].url, "https://s3.us-east-1.amazonaws.com/my-bucket");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
});

Deno.test("bucket-delete: propagates BucketNotEmpty as an Error", async () => {
  const { ctx } = mockCtx([
    { status: 409, body: "<Error><Code>BucketNotEmpty</Code><Message>not empty</Message></Error>" },
  ]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ bucket: "my-bucket" }, ctx)),
    Error,
    "not empty",
  );
});

Deno.test("bucket-delete: missing bucket rejects", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({ bucket: "" }, ctx)), Error, "bucket");
});
