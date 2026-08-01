import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payment-capture-get.ts";

Deno.test("payment-capture-get: fetches the capture by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "CAP-1", status: "COMPLETED" } }]);
  const result = await action.execute!({ captureId: "CAP-1" }, ctx);
  assertEquals(calls[0].url, "https://api-m.paypal.com/v2/payments/captures/CAP-1");
  assertEquals(result, { id: "CAP-1", status: "COMPLETED" });
});

Deno.test("payment-capture-get: captureId is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({ captureId: "" }, ctx)),
    Error,
    "`captureId`",
  );
  assertEquals(calls.length, 0);
});
