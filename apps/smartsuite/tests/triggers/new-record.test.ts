import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-record.ts";

const input = { params: { tableId: "tbl-1" }, subscriptionId: "sub-1" };
const rec = (id: string) => ({ id, first_created: { on: "2026-11-09T09:00:00.000000Z" } });
const page = (items: unknown[]) => ({
  body: { total: items.length, offset: 0, limit: 100, items },
});
const next = (r: unknown) => (r as { nextState: unknown }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;

test("new-record: seeds without emitting", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} } as never,
    mockCtx([page([rec("a")])]).ctx,
  );
  assertEquals(events(seeded), []);
  assertEquals((next(seeded) as { seeded?: boolean }).seeded, true);
});

test("new-record: emits only the unseen record and is idempotent on retry", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} } as never,
    mockCtx([page([rec("a")])]).ctx,
  );
  const first = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([page([rec("b"), rec("a")])]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([page([rec("b"), rec("a")])]).ctx,
  );
  assertEquals(events(first), [rec("b")]);
  assertEquals(retry, first);
});

test("new-record: an edited old record is not new", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} } as never,
    mockCtx([page([rec("a")])]).ctx,
  );
  const edited = { ...rec("a"), last_updated: { on: "2026-11-10T09:00:00.000000Z" } };
  const r = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([page([edited])]).ctx,
  );
  assertEquals(events(r), []);
});

test("new-record: requests the table's records sorted by first_created desc", async () => {
  const c = mockCtx([page([rec("a")])]);
  await trigger.poll!({ ...input, state: {} } as never, c.ctx);
  assertEquals(c.calls[0].method, "POST");
  assertEquals(
    c.calls[0].url,
    "https://app.smartsuite.com/api/v1/applications/tbl-1/records/list/?offset=0&limit=100",
  );
  assertEquals(c.calls[0].body, '{"sort":[{"field":"first_created","direction":"desc"}]}');
});
