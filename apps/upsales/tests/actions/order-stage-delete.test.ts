import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import orderStageDelete from "../../actions/order-stage-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

test("order-stage-delete: DELETEs /orderstages/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: null } }]);
  const out = await orderStageDelete.execute({ id: 7 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/orderstages/7`);
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true, id: 7 });
});

test("order-stage-delete: is marked idempotent", () => {
  assertEquals(orderStageDelete.idempotent, true);
});

test("order-stage-delete: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(async () => await orderStageDelete.execute({ id: 7 }, ctx), Error, "401");
});

test("order-stage-delete: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () => await orderStageDelete.execute({ id: 7 }, ctx),
    Error,
    "ThrottleLimit",
  );
});
