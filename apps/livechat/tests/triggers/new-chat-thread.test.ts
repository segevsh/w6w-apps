import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";
import trigger from "../../triggers/new-chat-thread.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const T0 = Date.UTC(2026, 10, 9, 12, 0, 0);
const input = { params: {}, subscriptionId: "sub-1" };
const chat = (id: string, thread: string) => ({ id, thread: { id: thread }, users: [] });
const page = (...cs: Array<ReturnType<typeof chat>>) => ({
  body: { chats: cs, found_chats: cs.length },
});

test("new-chat-thread: seeds, emits the new thread, retries, and requests the dated desc window", async () => {
  clock.now = () => T0;
  const seed = mockCtx([page(chat("C1", "T1"))]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(pathOf(seed.calls[0].url), "/v3.6/agent/action/list_archives");
  assertEquals(JSON.parse(seed.calls[0].body!), {
    filters: { from: "2026-11-09T11:58:00.000000+00:00" },
    limit: 100,
    sort_order: "desc",
  });
  clock.now = () => T0 + 300_000;
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([page(chat("C2", "T2"), chat("C1", "T1"))]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [chat("C2", "T2")]);
  assertEquals(await run(), first);
});

test("new-chat-thread: a second thread of a known chat is a new event", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([page(chat("C1", "T1"))]).ctx,
  );
  const out = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(chat("C1", "T2"), chat("C1", "T1"))]).ctx,
  );
  assertEquals(out.events, [chat("C1", "T2")]);
});
