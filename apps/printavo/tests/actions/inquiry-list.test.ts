import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/inquiry-list.ts";

Deno.test("inquiry-list: sends the inquiries(first operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        inquiries: {
          totalNodes: 1,
          pageInfo: { hasNextPage: true, endCursor: "c1" },
          nodes: [{ id: "1" }],
        },
      },
    },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(out, { nodes: [{ id: "1" }], totalNodes: 1, hasNextPage: true, endCursor: "c1" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("inquiries(first"), true);
  assertEquals(sent.variables, { "first": 25 });
});

Deno.test("inquiry-list: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
