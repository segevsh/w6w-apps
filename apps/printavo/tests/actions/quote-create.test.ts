import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/quote-create.ts";

Deno.test("quote-create: sends the quoteCreate operation and returns the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { quoteCreate: { id: "q1", visualId: "1001" } } },
  }]);
  const out = await action.execute({
    contactId: "8",
    customerDueAt: "2026-11-01",
    dueAt: "2026-10-30T12:00:00Z",
    tags: "rush, vip",
    nickname: "Tees",
  }, ctx);
  assertEquals(out, { id: "q1", visualId: "1001" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://www.printavo.com/api/v2");
  assertEquals(calls[0].method, "POST");
  assertEquals("authorization" in calls[0].headers, false);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("quoteCreate"), true);
  assertEquals(sent.variables, {
    input: {
      nickname: "Tees",
      customerDueAt: "2026-11-01",
      dueAt: "2026-10-30T12:00:00Z",
      tags: ["rush", "vip"],
      contact: { id: "8" },
    },
  });
});

Deno.test("quote-create: surfaces a GraphQL error returned with HTTP 200", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  let message = "";
  try {
    await action.execute({
      contactId: "8",
      customerDueAt: "2026-11-01",
      dueAt: "2026-10-30T12:00:00Z",
      tags: "rush, vip",
      nickname: "Tees",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Printavo GraphQL error: Unauthorized");
});
