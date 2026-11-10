import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-chat.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-or-updated-chat: seeds, emits new rows, retries idempotently, and requests the literal feed", async () => {
  const seed = ctx({ chats: [{ iden: "a", modified: 1 }] });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.pushbullet.com/v2/chats?active=true&limit=100",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ chats: [{ iden: "b", modified: 3 }, { iden: "a", modified: 1 }] }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ chats: [{ iden: "b", modified: 3 }, { iden: "a", modified: 1 }] }).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(first.events, [{ iden: "b", modified: 3 }]);
  assertEquals(retry, first);
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ chats: [{ iden: "a", modified: 2 }] }).ctx,
  );
  assertEquals(edited.events.length, 1);
});
