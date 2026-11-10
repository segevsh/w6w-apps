import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockMattermostCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-post.ts";
import { clock, MAX_EVENTS } from "../../lib/since.ts";

// Brief 9.8 (no stall) and 9.9 (seed floor) for new-post.
const input = { params: { channelId: "c1" }, subscriptionId: "sub-1" };
const T0 = 1_794_700_000_000;
const mk = (id: string, createAt: number) => ({ id, create_at: createAt });
/** `since` answers the whole window in one response: `order` newest-first plus the `posts` map. */
const reply = (posts: Array<{ id: string; create_at: number }>) => {
  const sorted = [...posts].sort((a, b) => b.create_at - a.create_at);
  return {
    body: {
      order: sorted.map((p) => p.id),
      posts: Object.fromEntries(sorted.map((p) => [p.id, p])),
    },
  };
};
const real = clock.now;

test("new-post: posts that existed at the seed are never emitted, however many the window holds", async () => {
  try {
    clock.now = () => T0;
    const seed = await trigger.poll!({ ...input, state: {} }, mockMattermostCtx([reply([])]).ctx);
    assertEquals(seed.events, []);
    clock.now = () => T0 + 300_000;
    const old = Array.from({ length: 250 }, (_, i) => mk(`o${i}`, T0 - 1000 - i));
    const r1 = await trigger.poll!(
      { ...input, state: seed.nextState },
      mockMattermostCtx([reply(old)]).ctx,
    );
    assertEquals(r1.events, []);
    clock.now = () => T0 + 600_000;
    const fresh = mk("fresh", T0 + 400_000);
    const r2 = await trigger.poll!(
      { ...input, state: r1.nextState },
      mockMattermostCtx([reply([...old, fresh])]).ctx,
    );
    assertEquals(r2.events, [fresh]);
  } finally {
    clock.now = real;
  }
});

test("new-post: a window holding more than MAX_EVENTS posts is emitted once across checks, cursor advances after the drain", async () => {
  const total = MAX_EVENTS + 100;
  const posts = Array.from({ length: total }, (_, i) => mk(`p${i}`, T0 + 1000 + i));
  const seen: string[] = [];
  try {
    clock.now = () => T0;
    const seed = await trigger.poll!({ ...input, state: {} }, mockMattermostCtx([reply([])]).ctx);
    clock.now = () => T0 + 300_000;
    const r1 = await trigger.poll!(
      { ...input, state: seed.nextState },
      mockMattermostCtx([reply(posts)]).ctx,
    );
    seen.push(...r1.events.map((e) => (e as { id: string }).id));
    assertEquals(r1.events.length, MAX_EVENTS);
    assertEquals((r1.nextState as { cursor: number }).cursor, T0 + 1000 + MAX_EVENTS - 1);
    clock.now = () => T0 + 600_000;
    const r2 = await trigger.poll!(
      { ...input, state: r1.nextState },
      mockMattermostCtx([reply(posts)]).ctx,
    );
    seen.push(...r2.events.map((e) => (e as { id: string }).id));
    assertEquals(seen.length, total);
    assertEquals(new Set(seen).size, total);
    assertEquals((r2.nextState as { cursor: number }).cursor, T0 + 600_000);
  } finally {
    clock.now = real;
  }
});
