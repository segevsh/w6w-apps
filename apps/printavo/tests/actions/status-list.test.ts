import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/status-list.ts";

Deno.test("status-list: sends the statuses(first operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        statuses: {
          totalNodes: 1,
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [{ id: "9" }],
        },
      },
    },
  }]);
  const out = await action.execute({ type: "QUOTE" }, ctx);
  assertEquals(out, { nodes: [{ id: "9" }], hasNextPage: false, endCursor: null, totalNodes: 1 });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("statuses(first"), true);
  assertEquals(sent.variables, { first: 25, type: "QUOTE" });
});

Deno.test("status-list: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ type: "QUOTE" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
