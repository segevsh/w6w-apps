import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payment-request-list.ts";

Deno.test("payment-request-list: sends the paymentRequests(first operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        paymentRequests: {
          totalNodes: 1,
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [{ id: "r1" }],
        },
      },
    },
  }]);
  const out = await action.execute({ status: "OPEN" }, ctx);
  assertEquals(out, { nodes: [{ id: "r1" }], hasNextPage: false, endCursor: null, totalNodes: 1 });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("paymentRequests(first"), true);
  assertEquals(sent.variables, { first: 25, status: "OPEN" });
});

Deno.test("payment-request-list: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ status: "OPEN" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
