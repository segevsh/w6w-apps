import { assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/send-sender-action.ts";

Deno.test("send-sender-action: typing_on carries only recipient and sender_action", async () => {
  const { ctx, calls } = mockCtx([{ body: { recipient_id: "p" } }]);
  const out = await action.execute!({ recipientId: "p", action: "typing_on" }, ctx);
  assertEquals(bodyOf(calls[0]), { recipient: { id: "p" }, sender_action: "typing_on" });
  assertEquals(new URL(calls[0].url).pathname, "/v26.0/me/messages");
  assertEquals(out, { recipient_id: "p" });
});

Deno.test("send-sender-action: mark_seen", async () => {
  const { ctx, calls } = mockCtx([{ body: { recipient_id: "p" } }]);
  await action.execute!({ recipientId: "p", action: "mark_seen" }, ctx);
  assertEquals(bodyOf(calls[0]).sender_action, "mark_seen");
});

Deno.test("send-sender-action: react puts message_id and reaction in payload", async () => {
  const { ctx, calls } = mockCtx([{ body: { recipient_id: "p" } }]);
  await action.execute!(
    { recipientId: "p", action: "react", messageId: "m1", reaction: "🎉" },
    ctx,
  );
  assertEquals(bodyOf(calls[0]), {
    recipient: { id: "p" },
    sender_action: "react",
    payload: { message_id: "m1", reaction: "🎉" },
  });
});

Deno.test("send-sender-action: unreact sends message_id only", async () => {
  const { ctx, calls } = mockCtx([{ body: { recipient_id: "p" } }]);
  await action.execute!(
    { recipientId: "p", action: "unreact", messageId: "m1", reaction: "x" },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).payload, { message_id: "m1" });
});

Deno.test("send-sender-action: react without message or emoji fails locally", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ recipientId: "p", action: "react", reaction: "x" }, ctx),
    Error,
    "messageId",
  );
  await assertRejects(
    async () => await action.execute!({ recipientId: "p", action: "react", messageId: "m" }, ctx),
    Error,
    "reaction",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-sender-action: idempotent", () => {
  assertEquals(action.idempotent, true);
});
