import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import recordChanges from "../../triggers/record-changes.ts";
import schemaChanges from "../../triggers/schema-changes.ts";
import { clock, PAGE_SIZE } from "../../lib/changes.ts";
import { connCtx } from "../_helpers.ts";

const params = { moduleName: "crm", tableName: "contacts" };
const REC =
  "https://go.ninox.com/api/v1/workspace/abcdefghij12/modules/crm/tables/contacts/records/changes";
const SCH = "https://go.ninox.com/api/v1/workspace/abcdefghij12/schema/changes";
const page = (data: unknown[], asOf: string, hasMore = false) => ({
  data,
  meta: { asOf },
  page_info: { has_more: hasMore },
});
const rc = (id: string) => ({ id, changeType: "updated", changedAt: "2026-11-10T10:00:00Z" });

function withClock<T>(ms: number, fn: () => Promise<T>): Promise<T> {
  const prev = clock.now;
  clock.now = () => ms;
  return fn().finally(() => (clock.now = prev));
}

const SEED_AT = Date.parse("2026-11-10T09:00:00Z");

test("record-changes: seed reads nothing, emits nothing and pins since to the seed time", async () => {
  const mock = connCtx([]);
  const seeded = await withClock(
    SEED_AT,
    () => recordChanges.poll!({ state: {}, params } as never, mock.ctx),
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(mock.calls.length, 0);
  assertEquals(
    (seeded.nextState as { token: string }).token,
    '{"since":"2026-11-10T09:00:00.000Z","offset":0}',
  );
});

test("record-changes: next check emits the new change, sends a literal request, advances since", async () => {
  const state = {
    v: 1,
    kind: "token",
    seeded: true,
    token: '{"since":"2026-11-10T09:00:00.000Z","offset":0}',
  };
  const responses = [{ body: page([rc("5")], "2026-11-10T10:05:00Z") }];
  const mock = connCtx(responses);
  const first = await recordChanges.poll!({ state, params } as never, mock.ctx);
  assertEquals(first.events, [rc("5")]);
  assertEquals(
    mock.calls[0].url,
    `${REC}?since=2026-11-10T09%3A00%3A00.000Z&limit=100&offset=0`,
  );
  assertEquals(
    (first.nextState as { token: string }).token,
    '{"since":"2026-11-10T10:05:00Z","offset":0}',
  );
  const retry = await recordChanges.poll!({ state, params } as never, connCtx(responses).ctx);
  assertEquals(retry, first);
});

test("record-changes: a window with more than one page resumes at the saved offset, none twice", async () => {
  let state: unknown = { v: 1, kind: "token", seeded: true, token: '{"since":"S0","offset":0}' };
  const ids1 = Array.from({ length: PAGE_SIZE }, (_, i) => `a${i}`);
  const ids2 = Array.from({ length: PAGE_SIZE }, (_, i) => `b${i}`);
  const ids3 = ["c0"];
  const seen: string[] = [];
  const m1 = connCtx([{ body: page(ids1.map(rc), "T1", true) }]);
  const r1 = await recordChanges.poll!({ state, params } as never, m1.ctx);
  state = r1.nextState;
  const m2 = connCtx([{ body: page(ids2.map(rc), "T1b", true) }]);
  const r2 = await recordChanges.poll!({ state, params } as never, m2.ctx);
  state = r2.nextState;
  const m3 = connCtx([{ body: page(ids3.map(rc), "T1c", false) }]);
  const r3 = await recordChanges.poll!({ state, params } as never, m3.ctx);
  for (const r of [r1, r2, r3]) seen.push(...(r.events as { id: string }[]).map((e) => e.id));
  assertEquals(seen, [...ids1, ...ids2, ...ids3]);
  assertEquals(new Set(seen).size, seen.length);
  assertEquals(m1.calls[0].url, `${REC}?since=S0&limit=100&offset=0`);
  assertEquals(m2.calls[0].url, `${REC}?since=S0&asOf=T1&limit=100&offset=100`);
  assertEquals(m3.calls[0].url, `${REC}?since=S0&asOf=T1&limit=100&offset=200`);
  assertEquals(
    (r3.nextState as { token: string }).token,
    '{"since":"T1","offset":0}',
  );
});

test("record-changes: no changes keeps the cursor and emits nothing (floor is the seed time)", async () => {
  const state = {
    v: 1,
    kind: "token",
    seeded: true,
    token: '{"since":"2026-11-10T09:00:00.000Z","offset":0}',
  };
  const out = await recordChanges.poll!(
    { state, params } as never,
    connCtx([{ body: page([], "2026-11-10T09:20:00Z") }]).ctx,
  );
  assertEquals(out.events, []);
  assertEquals(
    (out.nextState as { token: string }).token,
    '{"since":"2026-11-10T09:20:00Z","offset":0}',
  );
});

test("schema-changes: seed, literal request and resume", async () => {
  const mock = connCtx([]);
  const seeded = await withClock(
    SEED_AT,
    () => schemaChanges.poll!({ state: {}, params: {} } as never, mock.ctx),
  );
  assertEquals(seeded.events, []);
  assertEquals(mock.calls.length, 0);
  const change = { action: "created", changedAt: "2026-11-10T09:30:00Z", id: "A", kind: "Table" };
  const m = connCtx([{ body: page([change], "2026-11-10T09:31:00Z", true) }]);
  const out = await schemaChanges.poll!({ state: seeded.nextState, params: {} } as never, m.ctx);
  assertEquals(out.events, [change]);
  assertEquals(m.calls[0].url, `${SCH}?since=2026-11-10T09%3A00%3A00.000Z&limit=100&offset=0`);
  assertEquals(
    (out.nextState as { token: string }).token,
    '{"since":"2026-11-10T09:00:00.000Z","asOf":"2026-11-10T09:31:00Z","offset":1}',
  );
  const m2 = connCtx([{ body: page([], "2026-11-10T09:40:00Z") }]);
  await schemaChanges.poll!({ state: out.nextState, params: {} } as never, m2.ctx);
  assertEquals(
    m2.calls[0].url,
    `${SCH}?since=2026-11-10T09%3A00%3A00.000Z&asOf=2026-11-10T09%3A31%3A00Z&limit=100&offset=1`,
  );
});
