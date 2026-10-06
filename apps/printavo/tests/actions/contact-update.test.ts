import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: sends the contactUpdate operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { contactUpdate: { id: "8", phone: "555" } } },
  }]);
  const out = await action.execute({ id: "8", phone: "555" }, ctx);
  assertEquals(out, { id: "8", phone: "555" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("contactUpdate"), true);
  assertEquals(sent.variables, { id: "8", input: { phone: "555" } });
});

Deno.test("contact-update: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ id: "8", phone: "555" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
