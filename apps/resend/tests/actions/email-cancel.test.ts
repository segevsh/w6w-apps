import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-cancel.ts";

Deno.test("email-cancel: POSTs to the cancel endpoint with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "re_1" } }], { display: {} });
  await action.execute!({ emailId: "re_1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.resend.com/emails/re_1/cancel");
  assertEquals(calls[0].body, null);
});

Deno.test("email-cancel: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`emailId`");
  assertEquals(calls.length, 0);
});
