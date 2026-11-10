import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-audit-log-entry.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const T0 = 1762689600000;
const entry = (id: string, date = T0) => ({ _id: id, date, kind: "flag", name: id });
const page = (...ids: string[]) => ({ status: 200, body: { items: ids.map((id) => entry(id)) } });
const input = { params: {}, subscriptionId: "sub-1" };

test("new-audit-log-entry: first check seeds the cursor, emits nothing, asks after=now", async () => {
  clock.now = () => T0;
  const seed = mockCtx([page("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  const state = seeded.nextState as { seeded?: boolean; cursor?: number };
  assertEquals(state.seeded, true);
  assertEquals(state.cursor, T0);
  assertEquals(seed.calls[0].method, "GET");
  const url = new URL(seed.calls[0].url);
  assertEquals(url.pathname, "/api/v2/auditlog");
  assertEquals(url.searchParams.get("after"), String(T0 - 120_000));
  assertEquals(url.searchParams.get("limit"), "20");
});

test("new-audit-log-entry: emits the new entry only, after the previous cursor, idempotently", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([page("a")]).ctx);
  clock.now = () => T0 + 300_000;
  const run = () => {
    const r = mockCtx([page("b", "a")]);
    return trigger.poll!({ ...input, state: seeded.nextState }, r.ctx).then((out) => ({ out, r }));
  };
  const first = await run();
  assertEquals(first.out.events, [entry("b")]);
  assertEquals((first.out.nextState as { cursor?: number }).cursor, T0 + 300_000);
  assertEquals(new URL(first.r.calls[0].url).searchParams.get("after"), String(T0 - 120_000));
  assertEquals((await run()).out, first.out);
});
