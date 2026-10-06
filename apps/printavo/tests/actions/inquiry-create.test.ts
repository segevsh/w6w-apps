import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/inquiry-create.ts";

Deno.test("inquiry-create: sends the inquiryCreate operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { inquiryCreate: { id: "i1", name: "Cy" } } } }]);
  const out = await action.execute({ name: "Cy", request: "100 tees" }, ctx);
  assertEquals(out, { id: "i1", name: "Cy" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("inquiryCreate"), true);
  assertEquals(sent.variables, { input: { name: "Cy", request: "100 tees" } });
});

Deno.test("inquiry-create: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({ name: "Cy", request: "100 tees" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
