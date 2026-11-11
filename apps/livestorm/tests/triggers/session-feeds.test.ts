import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { list, mockCtx, pathOf, queryOf, resource } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import newSession from "../../triggers/new-session.ts";
import newOrUpdatedSession from "../../triggers/new-or-updated-session.ts";
import newRegistrant from "../../triggers/new-session-registrant.ts";
import newOrUpdatedRegistrant from "../../triggers/new-or-updated-session-registrant.ts";

// Since-filter feeds (brief 9.1 b): every case asserts a LITERAL request, the 9.9 floor and the 9.8 drain.
const T0 = 1_794_270_600_000; // 2026-11-10T00:30:00Z
const SECONDS = (ms: number) => Math.floor(ms / 1000);
const OLD = T0 - 3_600_000;
const realNow = Date.now;
let seq = 0;

const feeds = [
  {
    name: "new-session",
    trigger: newSession,
    params: {},
    type: "sessions",
    path: "/v1/sessions",
    filter: "filter[created_since]",
    stamp: "created_at",
    edited: false,
  },
  {
    name: "new-or-updated-session",
    trigger: newOrUpdatedSession,
    params: {},
    type: "sessions",
    path: "/v1/sessions",
    filter: "filter[updated_since]",
    stamp: "updated_at",
    edited: true,
  },
  {
    name: "new-session-registrant",
    trigger: newRegistrant,
    params: { sessionId: "s1" },
    type: "people",
    path: "/v1/sessions/s1/people",
    filter: "filter[created_since]",
    stamp: "created_at",
    edited: false,
  },
  {
    name: "new-or-updated-session-registrant",
    trigger: newOrUpdatedRegistrant,
    params: { sessionId: "s1" },
    type: "people",
    path: "/v1/sessions/s1/people",
    filter: "filter[updated_since]",
    stamp: "updated_at",
    edited: true,
  },
];

for (const f of feeds) {
  const input = { params: f.params, subscriptionId: "sub-1" };
  // `createdMs` is when the record was created, `updatedMs` when it was last edited.
  const rec = (createdMs: number, updatedMs = createdMs) =>
    resource(f.type, `${f.type}-${++seq}`, {
      created_at: SECONDS(createdMs),
      updated_at: SECONDS(updatedMs),
    });
  // The stamp the trigger filters on decides which of the two moves a record forward.
  const stampMs = (item: ReturnType<typeof rec>) => Number(item.attributes[f.stamp]) * 1000;
  const page = (items: unknown[]): MockResponse => ({ body: list(items as never) });
  const full = (count: number, createdMs: number): MockResponse[] =>
    Array.from({ length: count }, () => page(Array.from({ length: 100 }, () => rec(createdMs))));
  const run = async (state: unknown, now: number, responses: MockResponse[]) => {
    Date.now = () => now;
    try {
      const m = mockCtx(responses);
      return { ...(await f.trigger.poll!({ ...input, state }, m.ctx)), calls: m.calls };
    } finally {
      Date.now = realNow;
    }
  };

  test(`${f.name}: seed emits nothing and requests the literal filtered first page`, async () => {
    const seeded = await run({}, T0, [page([rec(OLD)])]);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals((seeded.nextState as { floor?: number }).floor, T0);
    assertEquals(seeded.calls.length, 1);
    assertEquals(seeded.calls[0].method, "GET");
    assertEquals(pathOf(seeded.calls[0].url), f.path);
    assertEquals(queryOf(seeded.calls[0].url), {
      [f.filter]: String(SECONDS(T0 - 120_000)),
      "page[number]": "0",
      "page[size]": "100",
    });
  });

  test(`${f.name}: emits only the record created after the seed, once, and reads from the stored cursor`, async () => {
    const seeded = await run({}, T0, [page([rec(OLD)])]);
    const fresh = rec(T0 + 100_000);
    const a = await run(seeded.nextState, T0 + 300_000, [page([fresh, rec(OLD)])]);
    const b = await run(seeded.nextState, T0 + 300_000, [page([fresh, rec(OLD)])]);
    assertEquals(a.events, [fresh]);
    assertEquals(b, a);
    assertEquals(queryOf(a.calls[0].url)[f.filter], String(SECONDS(T0 - 120_000)));
    // the same record seen again on the next check is not a new event
    const c = await run(a.nextState, T0 + 600_000, [page([fresh])]);
    assertEquals(c.events, []);
    assertEquals(queryOf(c.calls[0].url)[f.filter], String(SECONDS(T0 + 300_000 - 120_000)));
  });

  test(`${f.name}: records that predate the seed never fire, even over more than five full pages`, async () => {
    const seeded = await run({}, T0, [page([rec(OLD)])]);
    const flood = await run(seeded.nextState, T0 + 300_000, full(5, OLD));
    assertEquals(flood.calls.length, 5);
    assertEquals(flood.events, []);
    // page 6 (index 5) continues the same window; one record created after the seed is on it
    const fresh = rec(T0 + 400_000);
    const rest = await run(flood.nextState, T0 + 600_000, [page([rec(OLD), fresh])]);
    assertEquals(queryOf(rest.calls[0].url)["page[number]"], "5");
    assertEquals(rest.events, [fresh]);
  });

  test(`${f.name}: a window of six full pages drains across checks, none twice, then the cursor advances`, async () => {
    const seeded = await run({}, T0, [page([rec(OLD)])]);
    const window = full(6, T0 + 100_000);
    const first = await run(seeded.nextState, T0 + 300_000, window.slice(0, 5));
    assertEquals(first.events.length, 500);
    assertEquals((first.nextState as { cursor?: number }).cursor, T0);
    const second = await run(first.nextState, T0 + 600_000, [window[5], page([])]);
    assertEquals(second.calls.map((c) => queryOf(c.url)["page[number]"]), ["5", "6"]);
    assertEquals(second.events.length, 100);
    assertEquals((second.nextState as { cursor?: number }).cursor, T0 + 300_000);
    assertEquals((second.nextState as { resume?: unknown }).resume, undefined);
    const all = [...first.events, ...second.events].map((e) => (e as { id: string }).id);
    assertEquals(new Set(all).size, 600);
  });

  if (f.edited) {
    test(`${f.name}: an edited record is a new event, a second look at the same edit is not`, async () => {
      const old = rec(OLD);
      const seeded = await run({}, T0, [page([old])]);
      const edited = {
        ...old,
        attributes: { ...old.attributes, updated_at: SECONDS(T0 + 120_000) },
      };
      assertEquals(stampMs(edited) > T0, true);
      const a = await run(seeded.nextState, T0 + 300_000, [page([edited])]);
      assertEquals(a.events, [edited]);
      const b = await run(a.nextState, T0 + 600_000, [page([edited])]);
      assertEquals(b.events, []);
    });
  }
}

test("new-session-registrant: a missing session id is refused before any request", async () => {
  const m = mockCtx();
  await assertRejects(
    () => newRegistrant.poll!({ params: {}, subscriptionId: "s", state: {} }, m.ctx),
    Error,
    "Session ID",
  );
  assertEquals(m.calls.length, 0);
});
