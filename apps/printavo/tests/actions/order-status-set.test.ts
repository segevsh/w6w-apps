import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-status-set.ts";

Deno.test("order-status-set: sends the statusUpdate operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { statusUpdate: { id: "3", status: { id: "9" } } } },
  }]);
  const out = await action.execute({ orderId: "3", statusId: "9" }, ctx);
  assertEquals(out, { id: "3", status: { id: "9" } });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("statusUpdate"), true);
  assertEquals(sent.variables, { parentId: "3", statusId: "9" });
});

Deno.test("order-status-set: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ orderId: "3", statusId: "9" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
