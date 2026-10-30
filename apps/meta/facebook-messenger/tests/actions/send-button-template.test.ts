import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { bodyOf, mockCtx, SENT } from "../_helpers.ts";
import action from "../../actions/send-button-template.ts";

const button = { type: "web_url", url: "https://www.messenger.com", title: "Visit Messenger" };

test("send-button-template: builds the button template payload", async () => {
  const { ctx, calls } = mockCtx([{ body: SENT }]);
  await action.execute!({ recipientId: "p", text: "Next?", buttons: [button] }, ctx);
  assertEquals(bodyOf(calls[0]).message, {
    attachment: {
      type: "template",
      payload: { template_type: "button", text: "Next?", buttons: [button] },
    },
  });
});

test("send-button-template: buttons may arrive as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: SENT }]);
  await action.execute!({ recipientId: "p", text: "t", buttons: JSON.stringify([button]) }, ctx);
  assertEquals(calls.length, 1);
});

test("send-button-template: 0 or more than 3 buttons are rejected locally", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ recipientId: "p", text: "t", buttons: [] }, ctx),
    Error,
    "1 to 3",
  );
  await assertRejects(
    async () =>
      await action.execute!(
        { recipientId: "p", text: "t", buttons: [button, button, button, button] },
        ctx,
      ),
    Error,
    "1 to 3",
  );
  assertEquals(calls.length, 0);
});
