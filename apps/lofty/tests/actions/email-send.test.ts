import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-send.ts";

Deno.test("email-send: posts to the email endpoint and echoes the address used", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { messageId: "e1", toEmail: "recipient@example.com", subject: "Welcome" },
  }]);
  const result = await action.execute!({
    leadId: 563172647619608,
    subject: "Welcome to our service",
    content: "Hello",
  }, ctx) as { messageId: string; toEmail: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/message/email/send");
  assertEquals(JSON.parse(calls[0].body!), {
    leadId: 563172647619608,
    subject: "Welcome to our service",
    content: "Hello",
  });
  assertEquals(result.toEmail, "recipient@example.com");
});

Deno.test("email-send: an explicit recipient is sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    leadId: 1,
    subject: "s",
    content: "c",
    toEmail: "recipient@example.com",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).toEmail, "recipient@example.com");
});

Deno.test("email-send: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
