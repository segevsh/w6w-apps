import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-chat.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-chat: seeds, emits only added rows, retries idempotently, and requests the literal list", async () => {
  const seed = ctx({ chats: [{ iden: "a", name: "x" }] });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.pushbullet.com/v2/chats?active=true&limit=500",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ chats: [{ iden: "b", name: "y" }, { iden: "a", name: "x" }] }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ chats: [{ iden: "b", name: "y" }, { iden: "a", name: "x" }] }).ctx,
  );
  assertEquals(first.events, [{ iden: "b", name: "y" }]);
  assertEquals(retry, first);

  // an edited row (same key, new values) is not a "new" record
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ chats: [{ iden: "a", name: "renamed" }] }).ctx,
  );
  assertEquals(edited.events, []);
});
