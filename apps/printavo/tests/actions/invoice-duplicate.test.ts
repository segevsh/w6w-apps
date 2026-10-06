import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-duplicate.ts";

Deno.test("invoice-duplicate: sends the invoiceDuplicate operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { invoiceDuplicate: { id: "4" } } } }]);
  const out = await action.execute({ id: "3" }, ctx);
  assertEquals(out, { id: "4" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("invoiceDuplicate"), true);
  assertEquals(sent.variables, { id: "3" });
});

Deno.test("invoice-duplicate: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ id: "3" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
