import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-get.ts";

Deno.test("account-get: sends the account { operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { account: { id: "9", companyName: "Ink Co" } } },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(out, { id: "9", companyName: "Ink Co" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("account {"), true);
  assertEquals(sent.variables, {});
});

Deno.test("account-get: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
