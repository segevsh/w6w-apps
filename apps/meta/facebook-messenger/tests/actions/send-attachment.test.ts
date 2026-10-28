import { assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockCtx, SENT } from "../_helpers.ts";
import action from "../../actions/send-attachment.ts";

Deno.test("send-attachment: URL asset is sent in message.attachment", async () => {
  const { ctx, calls } = mockCtx([{ body: SENT }]);
  await action.execute!({ recipientId: "p", type: "image", url: "https://x/y.jpg" }, ctx);
  assertEquals(bodyOf(calls[0]).message, {
    attachment: { type: "image", payload: { url: "https://x/y.jpg" } },
  });
});

Deno.test("send-attachment: isReusable adds is_reusable", async () => {
  const { ctx, calls } = mockCtx([{ body: { ...SENT, attachment_id: "a1" } }]);
  const out = await action.execute!(
    { recipientId: "p", type: "video", url: "https://x/v.mp4", isReusable: true },
    ctx,
  );
  assertEquals(
    (bodyOf(calls[0]).message as { attachment: { payload: unknown } }).attachment.payload,
    { url: "https://x/v.mp4", is_reusable: true },
  );
  assertEquals(out.attachment_id, "a1");
});

Deno.test("send-attachment: a saved attachment id is used instead of a URL", async () => {
  const { ctx, calls } = mockCtx([{ body: SENT }]);
  await action.execute!({ recipientId: "p", type: "file", attachmentId: "123" }, ctx);
  assertEquals(bodyOf(calls[0]).message, {
    attachment: { type: "file", payload: { attachment_id: "123" } },
  });
});

Deno.test("send-attachment: needs exactly one of url / attachmentId", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ recipientId: "p", type: "image" }, ctx),
    Error,
    "required",
  );
  await assertRejects(
    async () =>
      await action.execute!({ recipientId: "p", type: "image", url: "u", attachmentId: "a" }, ctx),
    Error,
    "not both",
  );
  assertEquals(calls.length, 0);
});
