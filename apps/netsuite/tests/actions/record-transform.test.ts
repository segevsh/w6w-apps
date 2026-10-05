import { assertEquals, assertRejects } from "@std/assert";
import recordTransform from "../../actions/record-transform.ts";
import { BASE, created, mockCtx, run } from "../_helpers.ts";

Deno.test("record-transform: POSTs to /<from>/<id>/!transform/<to> and returns the new id", async () => {
  const { ctx, calls } = mockCtx([created("invoice", "5001")]);
  const out = await run(
    recordTransform,
    { fromType: "salesOrder", id: "3", toType: "invoice" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${BASE}/services/rest/record/v1/salesOrder/3/!transform/invoice`);
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "5001");
});

Deno.test("record-transform: field overrides become the body", async () => {
  const { ctx, calls } = mockCtx([created("creditMemo", "9")]);
  await run(recordTransform, {
    fromType: "invoice",
    id: "60",
    toType: "creditMemo",
    fields: { toBeEmailed: false },
  }, ctx);
  assertEquals(calls[0].body, '{"toBeEmailed":false}');
});

Deno.test("record-transform: the target type is validated too", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await run(recordTransform, { fromType: "salesOrder", id: "3", toType: "x/y" }, ctx),
    Error,
    "Invalid record type",
  );
  assertEquals(calls.length, 0);
});
