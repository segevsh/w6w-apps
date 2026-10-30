import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import messageMarkRead from "../../actions/message-mark-read.ts";
import { mockCtx, pathOf, statusOnly, usConnection } from "../_helpers.ts";

test("message-mark-read: defaults to markAsRead", async () => {
  const { ctx, calls } = mockCtx([{ body: statusOnly() }], usConnection({ accountId: "acc-1" }));
  const out = await messageMarkRead.execute({ messageId: "m1,m2" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/accounts/acc-1/updatemessage");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { mode: "markAsRead", messageId: ["m1", "m2"] });
  assertEquals(out, { ok: true });
});

test("message-mark-read: read=false marks unread", async () => {
  const { ctx, calls } = mockCtx([{ body: statusOnly() }], usConnection());
  await messageMarkRead.execute({ messageId: "m1", read: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { mode: "markAsUnread", messageId: ["m1"] });
});

test("message-mark-read: throws with no messageId, without making a request", async () => {
  const { ctx, calls } = mockCtx([], usConnection());
  await assertRejects(
    async () => {
      await messageMarkRead.execute({ messageId: "" }, ctx);
    },
    Error,
    "messageId",
  );
  assertEquals(calls.length, 0);
});

test("message-mark-read: is idempotent", () => {
  assertEquals(messageMarkRead.idempotent, true);
});
