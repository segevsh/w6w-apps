import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/quote-list.ts";

Deno.test("quote-list: sends the quotes(first operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        quotes: {
          totalNodes: 1,
          pageInfo: { hasNextPage: true, endCursor: "c1" },
          nodes: [{ id: "1" }],
        },
      },
    },
  }]);
  const out = await action.execute({ statusIds: "1, 2", sortDescending: true }, ctx);
  assertEquals(out, { nodes: [{ id: "1" }], totalNodes: 1, hasNextPage: true, endCursor: "c1" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("quotes(first"), true);
  assertEquals(sent.variables, { "first": 25, "statusIds": ["1", "2"], "sortDescending": true });
});

Deno.test("quote-list: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ statusIds: "1, 2", sortDescending: true }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
