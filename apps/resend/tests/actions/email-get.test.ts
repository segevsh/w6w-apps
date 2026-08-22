import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-get.ts";

Deno.test("email-get: returns the email with its latest delivery event", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "re_1", last_event: "delivered" } }], {
    display: {},
  });
  const result = await action.execute!({ emailId: "re_1" }, ctx);
  assertEquals(calls[0].url, "https://api.resend.com/emails/re_1");
  assertEquals((result as Record<string, unknown>).last_event, "delivered");
});

Deno.test("email-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`emailId`");
  assertEquals(calls.length, 0);
});
