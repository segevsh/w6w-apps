import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-issue.ts";
import { clock } from "../../lib/triggers.ts";

const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const T1 = T0 + 300_000;
const input = { params: { orgId: "org-1" }, subscriptionId: "sub-1" };
const SINCE_OLD = "2026-11-09T11:00:00.000Z"; // before the window start (T0 - 120 s)
const SINCE_NEW = "2026-11-09T12:03:00.000Z"; // inside the window
const rec = (id: string, created: string, updated: string) => ({
  id,
  type: "issue",
  attributes: { created_at: created, updated_at: updated },
});
const wrap = (data: unknown[]) => ({ data, links: {} });
const next = (r: unknown) => (r as { nextState: unknown }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;
const cursor = (r: unknown) => (next(r) as { cursor: number }).cursor;
const seed = async () => {
  clock.now = () => T0;
  const c = mockCtx([]);
  const r = await trigger.poll!({ ...input, state: {} } as never, c.ctx);
  return { r, calls: c.calls };
};

test("new-issue: first check seeds the cursor without a request or events", async () => {
  const { r, calls } = await seed();
  assertEquals(events(r), []);
  assertEquals((next(r) as { seeded?: boolean }).seeded, true);
  assertEquals(cursor(r), T0);
  assertEquals(calls.length, 0);
});

test("new-issue: emits the new record and skips an old one; a retry is identical", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const body = wrap([rec("fresh", SINCE_NEW, SINCE_NEW)]);
  const first = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([{ body }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([{ body }]).ctx,
  );
  assertEquals(events(first), [rec("fresh", SINCE_NEW, SINCE_NEW)]);
  assertEquals(retry, first);
  assertEquals(cursor(first), T1);
});

test("new-issue: requests the since window with the vendor's filter", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const c = mockCtx([{ body: wrap([]) }]);
  await trigger.poll!({ ...input, state: next(seeded) } as never, c.ctx);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://api.snyk.io/rest/orgs/org-1/issues?version=2026-03-25&created_after=2026-11-09T11%3A58%3A00.000Z&limit=100",
  );
});
