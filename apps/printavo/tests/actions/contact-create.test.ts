import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: sends the contactCreate operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { contactCreate: { id: "8", fullName: "Bo" } } },
  }]);
  const out = await action.execute({ customerId: "5", firstName: "Bo", email: "b@x.co" }, ctx);
  assertEquals(out, { id: "8", fullName: "Bo" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("contactCreate"), true);
  assertEquals(sent.variables, { id: "5", input: { firstName: "Bo", email: ["b@x.co"] } });
});

Deno.test("contact-create: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ customerId: "5", firstName: "Bo", email: "b@x.co" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
