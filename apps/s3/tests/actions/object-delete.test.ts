import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-delete.ts";

Deno.test("object-delete: DELETEs the key and reports deleted:true on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ bucket: "my-bucket", key: "a.txt" }, ctx);

  assertEquals(calls[0].url, "https://s3.us-east-1.amazonaws.com/my-bucket/a.txt");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
});

Deno.test("object-delete: appends versionId as a query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ bucket: "b", key: "a.txt", versionId: "v1" }, ctx);
  assertEquals(calls[0].url, "https://s3.us-east-1.amazonaws.com/b/a.txt?versionId=v1");
});

Deno.test("object-delete: propagates a non-204/2xx as an Error", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: "<Error><Code>AccessDenied</Code><Message>no</Message></Error>",
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ bucket: "b", key: "a.txt" }, ctx)),
    Error,
    "no",
  );
});

Deno.test("object-delete: missing params reject", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ bucket: "", key: "a" }, ctx)),
    Error,
    "bucket",
  );
});
