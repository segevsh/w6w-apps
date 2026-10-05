import { assertEquals, assertRejects } from "@std/assert";
import scheduleCancel from "../actions/subscription-schedule-cancel.ts";
import batchAdd from "../actions/order-batch-add-product.ts";
import addProduct from "../actions/order-add-product.ts";
import refund from "../actions/charge-refund.ts";
import cancel from "../actions/subscription-cancel.ts";
import { mockCtx } from "./_helpers.ts";

Deno.test("schedule-cancel: a custom cancelation needs a date, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(scheduleCancel.execute({ subscriptionId: 1, cancelWhen: "custom" }, ctx)),
    Error,
    "Schedule date is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("schedule-cancel: end of period needs no date", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await scheduleCancel.execute({ subscriptionId: 1, cancelWhen: "end" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { cancel_when: "end" });
});

Deno.test("batch-add: ids are sent as integer arrays; a bad id is refused", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { batch_id: "abc" } }]);
  const out = await batchAdd.execute({ orderIds: "1,2", productIds: "3" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { order_ids: [1, 2], product_ids: [3] });
  assertEquals(out, { response: { batch_id: "abc" } });
  await assertRejects(
    () => Promise.resolve(batchAdd.execute({ orderIds: "1,x", productIds: "3" }, ctx)),
    Error,
    "positive integer",
  );
});

Deno.test("add-product: a 409 (could not be charged) surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 409, body: { message: "The product could not be charged" } }]);
  await assertRejects(
    () => Promise.resolve(addProduct.execute({ orderId: 1, productId: 2 }, ctx)),
    Error,
    "could not be charged",
  );
});

Deno.test("refund: no amount means an empty JSON body, i.e. a full refund", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9 } }]);
  await refund.execute({ chargeId: 5 }, ctx);
  assertEquals(calls[0].url.endsWith("/v1/refunds/charges/5/"), true);
  assertEquals(calls[0].body, "{}");
});

Deno.test("cancel: silent_cancel false is kept, unset is dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }, { body: { id: 1 } }]);
  await cancel.execute({ subscriptionId: 1, silentCancel: false }, ctx);
  await cancel.execute({ subscriptionId: 1 }, ctx);
  assertEquals(calls[0].body, '{"silent_cancel":false}');
  assertEquals(calls[1].body, "{}");
});
