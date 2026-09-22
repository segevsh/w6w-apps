import { assertEquals } from "@std/assert";
import cancelPayment from "../../actions/cancel-payment.ts";
import { envelope, mockCtx, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

Deno.test("cancel-payment: POST …/actions/cancel with no credential or key of its own", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope("payments", { id: "PM1", status: "cancelled" }) },
  ]);
  const out = await cancelPayment.execute!({ paymentId: "PM1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/payments/PM1/actions/cancel");
  assertEquals(JSON.parse(calls[0].body!), { payments: {} });
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals("idempotency-key" in calls[0].headers, false);
  assertEquals((out as { status: string }).status, "cancelled");
});

Deno.test("cancel-payment: no Idempotency-Key even when the step has one", async () => {
  const { ctx, calls } = mockCtxWithInvocation(
    [{ body: envelope("payments", { id: "PM1" }) }],
    "inv-1",
  );
  await cancelPayment.execute!({ paymentId: "PM1" }, ctx);
  assertEquals("idempotency-key" in calls[0].headers, false);
});
