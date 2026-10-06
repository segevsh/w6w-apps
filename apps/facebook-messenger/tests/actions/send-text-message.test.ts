import { assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockCtx, SENT } from "../_helpers.ts";
import action from "../../actions/send-text-message.ts";

Deno.test("send-text-message: POSTs /me/messages with the documented envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: SENT }]);
  const result = await action.execute!({ recipientId: "psid-1", text: "Hello, world!" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v26.0/me/messages");
  assertEquals(bodyOf(calls[0]), {
    recipient: { id: "psid-1" },
    messaging_type: "RESPONSE",
    message: { text: "Hello, world!" },
  });
  assertEquals(result, SENT);
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("send-text-message: tag, messaging type, reply_to and pageId are carried", async () => {
  const { ctx, calls } = mockCtx([{ body: SENT }]);
  await action.execute!({
    recipientId: "p",
    text: "hi",
    messagingType: "MESSAGE_TAG",
    tag: "HUMAN_AGENT",
    replyToMessageId: "mid.0",
    pageId: "999",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v26.0/999/messages");
  const body = bodyOf(calls[0]);
  assertEquals(body.messaging_type, "MESSAGE_TAG");
  assertEquals(body.tag, "HUMAN_AGENT");
  assertEquals(body.reply_to, { mid: "mid.0" });
});

Deno.test("send-text-message: missing recipient fails before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ recipientId: "", text: "x" }, ctx),
    Error,
    "recipientId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-text-message: Graph errors surface with their code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { message: "outside window", code: 10 } },
  }]);
  await assertRejects(
    async () => await action.execute!({ recipientId: "p", text: "x" }, ctx),
    Error,
    "code 10",
  );
});

Deno.test("send-text-message: declares idempotent: false", () => {
  assertEquals(action.idempotent, false);
});
