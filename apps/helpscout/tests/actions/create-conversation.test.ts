import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-conversation.ts";

Deno.test("create-conversation: POSTs /conversations with a customer thread, and reads the id off Resource-ID", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, headers: { "resource-id": "123" } }]);
  const out = await action.execute({
    mailboxId: 85,
    subject: "Subject",
    customerEmail: "bear@acme.com",
    customerFirstName: "Vernon",
    initialMessage: "Hello, Help Scout. How are you?",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subject, "Subject");
  assertEquals(body.type, "email");
  assertEquals(body.status, "active");
  assertEquals(body.mailboxId, 85);
  assertEquals(body.customer, { email: "bear@acme.com", firstName: "Vernon" });
  assertEquals(body.threads, [{
    type: "customer",
    customer: { email: "bear@acme.com" },
    text: "Hello, Help Scout. How are you?",
  }]);
  assertEquals(out, { id: 123 });
});

Deno.test("create-conversation: splits tags on commas", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, headers: {} }]);
  await action.execute({
    mailboxId: 1,
    subject: "s",
    customerEmail: "a@b.c",
    initialMessage: "m",
    tags: "vip, urgent",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).tags, ["vip", "urgent"]);
});
