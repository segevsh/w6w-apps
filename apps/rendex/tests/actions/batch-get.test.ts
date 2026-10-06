import { assertEquals, assertRejects } from "@std/assert";
import batchGet from "../../actions/batch-get.ts";
import { envelope, mockCtx, obj, pathOf } from "../_helpers.ts";

Deno.test("batch-get: GETs /batches/{id}", async () => {
  const data = { batchId: "b/1", status: "completed", jobs: [{ jobId: "j", resultUrl: "u" }] };
  const { ctx, calls } = mockCtx([{ body: envelope(data) }]);
  const out = await obj(await batchGet.execute({ batchId: "b/1" }, ctx));
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/batches/b%2F1");
  assertEquals(out.status, "completed");
  await assertRejects(
    async () => await batchGet.execute({ batchId: "" }, ctx),
    Error,
    "Batch ID is required",
  );
});
