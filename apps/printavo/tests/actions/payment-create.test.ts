import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payment-create.ts";

Deno.test("payment-create: sends the transactionPaymentCreate operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { transactionPaymentCreate: { id: "p1", amount: 50 } } },
  }]);
  const out = await action.execute({ orderId: "3", amount: 50, category: "CASH" }, ctx);
  assertEquals(out, { id: "p1", amount: 50 });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("transactionPaymentCreate"), true);
  assertEquals(sent.variables, { input: { order: { id: "3" }, amount: 50, category: "CASH" } });
});

Deno.test("payment-create: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ orderId: "3", amount: 50, category: "CASH" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
