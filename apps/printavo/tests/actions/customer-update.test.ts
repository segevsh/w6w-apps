import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-update.ts";

Deno.test("customer-update: sends the customerUpdate operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { customerUpdate: { id: "5", companyName: "New" } } },
  }]);
  const out = await action.execute({ id: "5", companyName: "New", taxExempt: false }, ctx);
  assertEquals(out, { id: "5", companyName: "New" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("customerUpdate"), true);
  assertEquals(sent.variables, { id: "5", input: { companyName: "New", taxExempt: false } });
});

Deno.test("customer-update: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ id: "5", companyName: "New", taxExempt: false }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
