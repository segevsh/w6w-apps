import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-create.ts";

Deno.test("customer-create: sends the customerCreate operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { customerCreate: { id: "5", companyName: "Acme" } } },
  }]);
  const out = await action.execute({
    companyName: "Acme",
    firstName: "Ann",
    email: "a@x.co, b@x.co",
    ownerId: "7",
  }, ctx);
  assertEquals(out, { id: "5", companyName: "Acme" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("customerCreate"), true);
  assertEquals(sent.variables, {
    input: {
      companyName: "Acme",
      owner: { id: "7" },
      primaryContact: { firstName: "Ann", email: ["a@x.co", "b@x.co"] },
    },
  });
});

Deno.test("customer-create: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({
      companyName: "Acme",
      firstName: "Ann",
      email: "a@x.co, b@x.co",
      ownerId: "7",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
