import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-list.ts";

Deno.test("task-list: sends the tasks(first operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        tasks: {
          totalNodes: 1,
          pageInfo: { hasNextPage: true, endCursor: "c1" },
          nodes: [{ id: "1" }],
        },
      },
    },
  }]);
  const out = await action.execute({ completed: false, includedOrderStatusIds: "4" }, ctx);
  assertEquals(out, { nodes: [{ id: "1" }], totalNodes: 1, hasNextPage: true, endCursor: "c1" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("tasks(first"), true);
  assertEquals(sent.variables, {
    "first": 25,
    "completed": false,
    "includedOrderStatusIds": ["4"],
  });
});

Deno.test("task-list: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ completed: false, includedOrderStatusIds: "4" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
