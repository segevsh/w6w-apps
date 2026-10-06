import { assertEquals } from "@std/assert";
import paymentVoid from "../../actions/payment-void.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-void: POST /payments/:id/void with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "31", status: "void" } }]);
  const out = await paymentVoid.execute({ id: "31" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/payments/31/void");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "31", status: "void" });
});

Deno.test("payment-void: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => paymentVoid.execute({ id: "" }, ctx), Error, "id is required");
  assertEquals(calls.length, 0);
});
