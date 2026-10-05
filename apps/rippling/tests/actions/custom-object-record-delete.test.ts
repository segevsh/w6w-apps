import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import customObjectRecordDelete from "../../actions/custom-object-record-delete.ts";

Deno.test("custom-object-record-delete: DELETEs .../records/<codr_id>/ and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await customObjectRecordDelete.execute(
    { customObjectApiName: "asset", recordId: "r1" },
    ctx,
  );

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/custom-objects/asset/records/r1/");
  assertEquals(out, { deleted: true });
});

Deno.test("custom-object-record-delete: requires both identifiers", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        customObjectRecordDelete.execute({ customObjectApiName: "", recordId: "r" }, ctx)
      ),
    Error,
    "customObjectApiName is required",
  );
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        customObjectRecordDelete.execute({ customObjectApiName: "a", recordId: "" }, ctx)
      ),
    Error,
    "recordId is required",
  );
  assertEquals(calls.length, 0);
});
