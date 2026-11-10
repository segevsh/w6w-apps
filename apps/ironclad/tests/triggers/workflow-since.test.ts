import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";
import newWorkflow from "../../triggers/new-workflow.ts";
import newOrUpdatedWorkflow from "../../triggers/new-or-updated-workflow.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const T0 = Date.UTC(2026, 10, 10, 12, 0, 0);
const BEFORE = "2026-11-01T00:00:00Z";
const AFTER = "2026-11-10T12:03:00Z";
const sub = { params: {}, subscriptionId: "sub-1" };

type T = typeof newWorkflow;
const variants: Array<{ trigger: T; field: "created" | "lastUpdated" }> = [
  { trigger: newWorkflow, field: "created" },
  { trigger: newOrUpdatedWorkflow, field: "lastUpdated" },
];

for (const { trigger, field } of variants) {
  const wf = (id: string, stamp: string) => ({ id, [field]: stamp });
  const many = (prefix: string, n: number, stamp: string) =>
    Array.from({ length: n }, (_, i) => wf(`${prefix}${i}`, stamp));
  const respond = (list: unknown[], count = list.length) => ({
    body: { ...page(list), count },
  });
  const poll = (state: unknown, responses: ReturnType<typeof respond>[]) => {
    const m = mockCtx(responses);
    return trigger.poll!({ ...sub, state }, m.ctx).then((r) => ({ r, calls: m.calls }));
  };

  test(`${trigger.key}: seeds with floor, emits the new workflow, retries identically, sends the literal request`, async () => {
    clock.now = () => T0;
    const { r: seeded, calls } = await poll({}, [respond([wf("old", BEFORE)])]);
    assertEquals(seeded.events, []);
    const st = seeded.nextState as { seeded?: boolean; floor?: number; cursor?: string };
    assertEquals(st.seeded, true);
    assertEquals(st.floor, T0);
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "GET");
    assertEquals(pathOf(calls[0].url), "/public/api/v1/workflows");
    assertEquals(queryOf(calls[0].url), { page: "0", pageSize: "100", lastUpdated: "2026-11-10" });

    clock.now = () => T0 + 300_000;
    const resp = [respond([wf("new", AFTER), wf("old", BEFORE)])];
    const first = await poll(seeded.nextState, resp);
    const second = await poll(seeded.nextState, resp);
    assertEquals(first.r.events, [wf("new", AFTER)]);
    assertEquals(first.r, second.r);
    assertEquals(queryOf(first.calls[0].url), {
      page: "0",
      pageSize: "100",
      lastUpdated: "2026-11-10",
    });
  });

  test(`${trigger.key}: asks for the cursor date minus the overlap and passes a chosen status`, async () => {
    clock.now = () => T0;
    const seeded = (await poll({}, [respond([])])).r;
    clock.now = () => T0 + 86_400_000 + 600_000; // next day, 12:10
    const m = mockCtx([respond([])]);
    await trigger.poll!(
      { params: { status: "active, completed" }, subscriptionId: "s", state: seeded.nextState },
      m.ctx,
    );
    assertEquals(queryOf(m.calls[0].url), {
      page: "0",
      pageSize: "100",
      lastUpdated: "2026-11-10",
      status: "active,completed",
    });
  });

  test(`${trigger.key}: a window longer than a page is resumed, nothing twice, cursor moves after the drain`, async () => {
    clock.now = () => T0;
    const seeded = (await poll({}, [respond([])])).r;
    clock.now = () => T0 + 300_000;
    const p0 = many("a", 100, AFTER);
    const p1 = many("b", 50, AFTER);
    const c1 = await poll(seeded.nextState, [respond(p0, 150)]);
    assertEquals(c1.r.events.length, 100);
    const s1 = c1.r.nextState as { resume?: { page: number }; cursor?: string };
    assertEquals(s1.resume?.page, 1);
    assertEquals(s1.cursor, new Date(T0).toISOString());

    clock.now = () => T0 + 600_000;
    const c2 = await poll(c1.r.nextState, [respond(p1, 150)]);
    assertEquals(queryOf(c2.calls[0].url).page, "1");
    assertEquals(c2.r.events.length, 50);
    const ids = [...c1.r.events, ...c2.r.events].map((e) => (e as { id: string }).id);
    assertEquals(new Set(ids).size, 150);
    const s2 = c2.r.nextState as { resume?: unknown; cursor?: string };
    assertEquals(s2.resume, undefined);
    assertEquals(s2.cursor, new Date(T0 + 300_000).toISOString()); // the drained window's own start
  });

  test(`${trigger.key}: nothing that predates the seed is ever emitted, however long the window`, async () => {
    clock.now = () => T0;
    const seeded = (await poll({}, [respond([])])).r;
    clock.now = () => T0 + 300_000;
    const c1 = await poll(seeded.nextState, [respond(many("o", 100, BEFORE), 200)]);
    assertEquals(c1.r.events, []);
    const c2 = await poll(c1.r.nextState, [respond(many("p", 100, BEFORE), 200)]);
    assertEquals(c2.r.events, []);
    const c3 = await poll(c2.r.nextState, [
      respond([wf("fresh", AFTER), ...many("q", 99, BEFORE)]),
    ]);
    assertEquals(c3.r.events, [wf("fresh", AFTER)]);
  });
}

test("new-or-updated-workflow: an edit of an old workflow is a new event", async () => {
  clock.now = () => T0;
  const old = { id: "w1", lastUpdated: BEFORE };
  const m0 = mockCtx([{ body: page([old]) }]);
  const seeded = await newOrUpdatedWorkflow.poll!({ ...sub, state: {} }, m0.ctx);
  clock.now = () => T0 + 300_000;
  const edited = { id: "w1", lastUpdated: AFTER };
  const out = await newOrUpdatedWorkflow.poll!(
    { ...sub, state: seeded.nextState },
    mockCtx([{ body: page([edited, old]) }]).ctx,
  );
  assertEquals(out.events, [edited]);
});

test("new-workflow: an edit of an old workflow is not a new event", async () => {
  clock.now = () => T0;
  const old = { id: "w1", created: BEFORE, lastUpdated: BEFORE };
  const seeded = await newWorkflow.poll!(
    { ...sub, state: {} },
    mockCtx([{ body: page([old]) }]).ctx,
  );
  clock.now = () => T0 + 300_000;
  const out = await newWorkflow.poll!(
    { ...sub, state: seeded.nextState },
    mockCtx([{ body: page([{ ...old, lastUpdated: AFTER }]) }]).ctx,
  );
  assertEquals(out.events, []);
});
