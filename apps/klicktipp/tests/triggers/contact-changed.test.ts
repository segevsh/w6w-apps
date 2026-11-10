import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/contact-changed.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const T0 = 1_794_225_600; // 2026-11-09T12:00:00Z
const input = { params: {}, subscriptionId: "sub-1" };
const page = (ids: string[], nextCursor: string | null = null) => ({
  body: { subscriberIds: ids, nextCursor },
});

test("contact-changed: seeds the cursor, emits nothing, asks from=now with limit 200", async () => {
  clock.now = () => T0 * 1000;
  const seed = mockCtx([page(["1"])]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  const state = seeded.nextState as { seeded?: boolean; cursor?: number };
  assertEquals(state.seeded, true);
  assertEquals(state.cursor, T0);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.klicktipp.com/subscriber/changed?from=1794225600&limit=200",
  );
});

test("contact-changed: emits newly changed ids from the previous cursor, skips the boundary id, is idempotent", async () => {
  clock.now = () => T0 * 1000;
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([page(["1"])]).ctx);
  clock.now = () => (T0 + 300) * 1000;
  const run = () => {
    const r = mockCtx([page(["1", "2", "3"])]);
    return trigger.poll!({ ...input, state: seeded.nextState }, r.ctx).then((out) => ({ out, r }));
  };
  const first = await run();
  assertEquals(first.out.events, [{ subscriberId: "2" }, { subscriberId: "3" }]);
  assertEquals((first.out.nextState as { cursor?: number }).cursor, T0 + 300);
  assertEquals(
    first.r.calls[0].url,
    "https://api.klicktipp.com/subscriber/changed?from=1794225600&limit=200",
  );
  assertEquals((await run()).out, first.out);
});

test("contact-changed: pages through nextCursor and skips a boundary-second repeat", async () => {
  clock.now = () => T0 * 1000;
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([page(["1"])]).ctx);
  clock.now = () => (T0 + 300) * 1000;
  const second = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(["2"], "c1"), page(["3"])]).ctx,
  );
  assertEquals(second.events, [{ subscriberId: "2" }, { subscriberId: "3" }]);
  clock.now = () => (T0 + 600) * 1000;
  const r = mockCtx([page(["2"])]);
  const third = await trigger.poll!({ ...input, state: second.nextState }, r.ctx);
  assertEquals(r.calls[0].url.includes("from=1794225900"), true);
  assertEquals(third.events, []); // boundary-second duplicate of the previous listing
});
