import { assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockCtx, SENT } from "../_helpers.ts";
import action from "../../actions/send-quick-replies.ts";

const qr = { content_type: "text", title: "Red", payload: "RED" };

Deno.test("send-quick-replies: text and quick_replies share one message", async () => {
  const { ctx, calls } = mockCtx([{ body: SENT }]);
  await action.execute!({ recipientId: "p", text: "Pick a color:", quickReplies: [qr] }, ctx);
  assertEquals(bodyOf(calls[0]).message, { text: "Pick a color:", quick_replies: [qr] });
});

Deno.test("send-quick-replies: 14 quick replies are rejected locally", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!({ recipientId: "p", text: "t", quickReplies: Array(14).fill(qr) }, ctx),
    Error,
    "1 to 13",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-quick-replies: invalid JSON names the param", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ recipientId: "p", text: "t", quickReplies: "[oops" }, ctx),
    Error,
    "quickReplies is not valid JSON",
  );
});
