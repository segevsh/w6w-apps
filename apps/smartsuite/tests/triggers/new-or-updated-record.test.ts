import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-record.ts";

const input = { params: { tableId: "tbl-1" }, subscriptionId: "sub-1" };
const rec = (id: string, on = "2026-11-09T09:00:00.000000Z") => ({ id, last_updated: { on } });
const page = (items: unknown[]) => ({
  body: { total: items.length, offset: 0, limit: 100, items },
});
const next = (r: unknown) => (r as { nextState: unknown }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;

test("new-or-updated-record: seeds without emitting", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} } as never,
    mockCtx([page([rec("a")])]).ctx,
  );
  assertEquals(events(seeded), []);
  assertEquals((next(seeded) as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-record: emits the unseen record and is idempotent on retry", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} } as never,
    mockCtx([page([rec("a")])]).ctx,
  );
  const items = [rec("b"), rec("a")];
  const first = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([page(items)]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([page(items)]).ctx,
  );
  assertEquals(events(first), [rec("b")]);
  assertEquals(retry, first);
});

test("new-or-updated-record: an edited record (same id, new last_updated) is emitted again", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} } as never,
    mockCtx([page([rec("a")])]).ctx,
  );
  const edited = rec("a", "2026-11-10T09:00:00.000000Z");
  const r = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([page([edited, rec("a")])]).ctx,
  );
  assertEquals(events(r), [edited]);
});

test("new-or-updated-record: requests the table's records sorted by last_updated desc", async () => {
  const c = mockCtx([page([rec("a")])]);
  await trigger.poll!({ ...input, state: {} } as never, c.ctx);
  assertEquals(c.calls[0].method, "POST");
  assertEquals(
    c.calls[0].url,
    "https://app.smartsuite.com/api/v1/applications/tbl-1/records/list/?offset=0&limit=100",
  );
  assertEquals(c.calls[0].body, '{"sort":[{"field":"last_updated","direction":"desc"}]}');
});
