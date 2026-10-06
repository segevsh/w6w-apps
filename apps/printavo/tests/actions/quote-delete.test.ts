import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/quote-delete.ts";

Deno.test("quote-delete: sends the quoteDelete(id operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { quoteDelete: { id: "42" } } } }]);
  const out = await action.execute({ id: "42" }, ctx);
  assertEquals(out, { id: "42" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("quoteDelete(id"), true);
  assertEquals(sent.variables, { id: "42" });
});

Deno.test("quote-delete: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ id: "42" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
