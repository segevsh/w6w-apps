import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockPeopleCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-record.ts";
import { clock } from "../../lib/triggers.ts";

const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const T1 = T0 + 300_000;
const input = { params: { formLinkName: "employee" }, subscriptionId: "sub-1" };
const PRE = T0 - 30_000; // before the seed, inside the overlap window
const POST = T0 + 180_000;
const row = (id: string, modified: number) => ({
  [id]: [{ Zoho_ID: id, ModifiedTime: String(modified) }],
});
const flat = (id: string, modified: number) => ({
  recordId: id,
  Zoho_ID: id,
  ModifiedTime: String(modified),
});
const wrap = (...rows: unknown[]) => ({
  body: { response: { result: rows, message: "Data fetched successfully", status: 0 } },
});
const next = (r: unknown) => (r as { nextState: unknown }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;
const seed = async () => {
  clock.now = () => T0;
  const c = mockPeopleCtx([]);
  const r = await trigger.poll!({ ...input, state: {} } as never, c.ctx);
  return { r, calls: c.calls };
};
const many = (p: number, n: number, at: number) =>
  Array.from({ length: n }, (_, i) => row(`${p}${String(i).padStart(3, "0")}`, at));

test("new-or-updated-record: first check seeds without a request or events", async () => {
  const { r, calls } = await seed();
  assertEquals(events(r), []);
  assertEquals((next(r) as { seeded?: boolean }).seeded, true);
  assertEquals(calls.length, 0);
});

test("new-or-updated-record: emits the changed record; retry identical; request is literal", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const c = mockPeopleCtx([wrap(row("1", POST))]);
  const first = await trigger.poll!({ ...input, state: next(seeded) } as never, c.ctx);
  const retry = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockPeopleCtx([wrap(row("1", POST))]).ctx,
  );
  assertEquals(events(first), [flat("1", POST)]);
  assertEquals(retry, first);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://people.zoho.com/people/api/forms/employee/getRecords?sIndex=1&limit=200&modifiedtime=1794225480000",
  );
});

test("new-or-updated-record: an edit (same record, new ModifiedTime) is a new event", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const a = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockPeopleCtx([wrap(row("1", POST))]).ctx,
  );
  clock.now = () => T1 + 300_000;
  const b = await trigger.poll!(
    { ...input, state: next(a) } as never,
    mockPeopleCtx([wrap(row("1", POST + 120_000))]).ctx,
  );
  assertEquals(events(b), [flat("1", POST + 120_000)]);
});

test("new-or-updated-record: a window longer than maxPages resumes at sIndex, then drains once", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const c1 = mockPeopleCtx([
    wrap(...many(0, 200, POST)),
    wrap(...many(1, 200, POST)),
    wrap(...many(2, 200, POST)),
  ]);
  const a = await trigger.poll!({ ...input, state: next(seeded) } as never, c1.ctx);
  assertEquals(events(a).length, 600);
  assertEquals(c1.calls.length, 3);
  assertEquals(
    c1.calls.map((c) => new URL(c.url).searchParams.get("sIndex")),
    ["1", "201", "401"],
  );
  assertEquals((next(a) as { resume?: unknown }).resume !== undefined, true);
  clock.now = () => T1 + 300_000;
  const c2 = mockPeopleCtx([wrap(...many(3, 5, POST))]);
  const b = await trigger.poll!({ ...input, state: next(a) } as never, c2.ctx);
  assertEquals(new URL(c2.calls[0].url).searchParams.get("sIndex"), "601");
  assertEquals(
    new URL(c2.calls[0].url).searchParams.get("modifiedtime"),
    new URL(c1.calls[0].url).searchParams.get("modifiedtime"),
  );
  assertEquals(events(b).length, 5);
  assertEquals((next(b) as { resume?: unknown }).resume, undefined);
  const all = [...events(a), ...events(b)] as { recordId: string }[];
  assertEquals(new Set(all.map((x) => x.recordId)).size, 605);
});

test("new-or-updated-record: records last modified before the seed are never emitted; one after is (seed floor)", async () => {
  const { r: seeded } = await seed();
  let state = next(seeded);
  let emitted = 0;
  let now = T1;
  for (
    const responses of [
      [wrap(...many(0, 200, PRE)), wrap(...many(1, 200, PRE)), wrap(...many(2, 200, PRE))],
      [wrap(...many(3, 5, PRE))],
    ]
  ) {
    clock.now = () => now;
    const r = await trigger.poll!({ ...input, state } as never, mockPeopleCtx(responses).ctx);
    emitted += events(r).length;
    state = next(r);
    now += 300_000;
  }
  assertEquals(emitted, 0);
  clock.now = () => now;
  const r = await trigger.poll!(
    { ...input, state } as never,
    mockPeopleCtx([wrap(row("post", now - 10_000))]).ctx,
  );
  assertEquals(events(r), [flat("post", now - 10_000)]);
});
