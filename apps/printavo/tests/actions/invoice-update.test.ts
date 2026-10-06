import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-update.ts";

Deno.test("invoice-update: sends the invoiceUpdate operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { invoiceUpdate: { id: "3", nickname: "Rush" } } },
  }]);
  const out = await action.execute({ id: "3", nickname: "Rush", tags: "a" }, ctx);
  assertEquals(out, { id: "3", nickname: "Rush" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("invoiceUpdate"), true);
  assertEquals(sent.variables, { id: "3", input: { nickname: "Rush", tags: ["a"] } });
});

Deno.test("invoice-update: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ id: "3", nickname: "Rush", tags: "a" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
