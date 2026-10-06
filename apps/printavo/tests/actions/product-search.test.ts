import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/product-search.ts";

Deno.test("product-search: sends the products(query operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        products: {
          totalNodes: 1,
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [{ id: "pr1" }],
        },
      },
    },
  }]);
  const out = await action.execute({ query: "bella 3001" }, ctx);
  assertEquals(out, { nodes: [{ id: "pr1" }], hasNextPage: false, endCursor: null, totalNodes: 1 });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("products(query"), true);
  assertEquals(sent.variables, { query: "bella 3001", first: 25 });
});

Deno.test("product-search: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ query: "bella 3001" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
