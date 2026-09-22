import { assert, assertEquals, assertRejects } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/send-conversation-message.ts";

Deno.test("send-conversation-message: POSTs only body + communicationType, defaulting to email", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 326, status: "sent" })]);
  await action.execute({ conversationId: 1406, body: "hello guest" }, ctx);

  assertEquals(calls[0].url, "https://api.hostaway.com/v1/conversations/1406/messages");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { body: "hello guest", communicationType: "email" });
});

Deno.test("send-conversation-message: accepts the four documented communication types", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 1 })]);
  await action.execute({ conversationId: 1, body: "hi", communicationType: "whatsapp" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { body: "hi", communicationType: "whatsapp" });
  assertEquals(
    (action.params?.find((p) => p.key === "communicationType")?.options as Array<{ value: string }>)
      .map((o) => o.value),
    ["email", "channel", "sms", "whatsapp"],
  );
});

Deno.test("send-conversation-message: requires the message body and the conversation", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute({ conversationId: 1406 }, ctx)),
    Error,
    "`body` is required",
  );
  await assertRejects(
    () => Promise.resolve(action.execute({ body: "hi" }, ctx)),
    Error,
    "`conversationId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-conversation-message: the 30/minute rate limit is documented on the action", () => {
  assert(
    /30 requests per minute/i.test(action.description ?? ""),
    "the description must carry the documented limit",
  );
});
