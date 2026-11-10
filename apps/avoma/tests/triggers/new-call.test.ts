import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pageBody } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import trigger from "../../triggers/new-call.ts";
import { clock } from "../../lib/triggers.ts";

// Brief 9.1(b) since-filter, 9.8 (a window longer than maxPages resumes, never stalls) and 9.9 (the
// seed floor: calls that predate the first check never fire).
const input = { params: {}, subscriptionId: "sub-1" };
const T0 = Date.UTC(2026, 10, 10, 12, 0, 0);
const OLD = T0 - 7_200_000;
const iso = (ms: number): string => new Date(ms).toISOString();
let seq = 0;
const call = (startMs: number) => ({ external_id: `call-${++seq}`, start_at: iso(startMs) });
const page = (calls: unknown[], next: string | null): MockResponse => ({
  body: pageBody(calls, { next }),
});
const NEXT = (n: number) => `https://api.avoma.com/v1/calls/?page=${n}`;
const run = async (state: unknown, now: number, responses: MockResponse[]) => {
  clock.now = () => now;
  const m = mockCtx(responses);
  const result = await trigger.poll!({ ...input, state }, m.ctx);
  return { result, calls: m.calls };
};
const ids = (events: unknown[]) =>
  events.map((e) => (e as { external_id: string }).external_id).sort();

describe("new-call", () => {
  test("seeds without emitting, then emits only the call that started after the seed", async () => {
    const old = call(OLD);
    const seeded = await run({}, T0, [page([old], null)]);
    assertEquals(seeded.result.events, []);
    assertEquals((seeded.result.nextState as { seeded?: boolean }).seeded, true);

    const fresh = call(T0 + 60_000);
    const responses = () => [page([fresh, old], null)];
    const first = await run(seeded.result.nextState, T0 + 300_000, responses());
    const retry = await run(seeded.result.nextState, T0 + 300_000, responses());
    assertEquals(first.result.events, [fresh]);
    assertEquals(retry.result, first.result);
  });

  test("sends the since-filter window as the literal request", async () => {
    const seed = await run({}, T0, [page([], null)]);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      "https://api.avoma.com/v1/calls/?from_date=2026-11-10T11%3A00%3A00.000Z&to_date=2026-11-10T12%3A00%3A00.000Z",
    );
    const later = await run(seed.result.nextState, T0 + 300_000, [page([], null)]);
    assertEquals(
      later.calls[0].url,
      "https://api.avoma.com/v1/calls/?from_date=2026-11-10T11%3A00%3A00.000Z&to_date=2026-11-10T12%3A05%3A00.000Z",
    );
  });

  test("forwards the direction param to the call list request", async () => {
    clock.now = () => T0;
    const m = mockCtx([page([], null)]);
    await trigger.poll!(
      { params: { direction: "inbound" }, subscriptionId: "sub-1", state: {} },
      m.ctx,
    );
    assertEquals(
      m.calls[0].url,
      "https://api.avoma.com/v1/calls/?from_date=2026-11-10T11%3A00%3A00.000Z&to_date=2026-11-10T12%3A00%3A00.000Z&direction=inbound",
    );
  });

  test("a window of more than maxPages pages of pre-seed calls never fires (9.9)", async () => {
    const seeded = await run({}, T0, [page([], null)]);
    const preSeed = () => Array.from({ length: 10 }, () => call(OLD));
    const t1 = T0 + 300_000;
    const a = await run(seeded.result.nextState, t1, [
      page(preSeed(), NEXT(2)),
      page(preSeed(), NEXT(3)),
      page(preSeed(), NEXT(4)),
    ]);
    assertEquals(a.result.events, []);
    const b = await run(a.result.nextState, t1 + 300_000, [page(preSeed(), null)]);
    assertEquals(b.result.events, []);
    const fresh = call(t1 + 400_000);
    const c = await run(b.result.nextState, t1 + 600_000, [page([fresh], null)]);
    assertEquals(c.result.events, [fresh]);
  });

  test("a long window is drained across checks, each call once, then the cursor advances (9.8)", async () => {
    const seeded = await run({}, T0, [page([], null)]);
    const t1 = T0 + 600_000;
    const batch = (n: number) => Array.from({ length: 10 }, (_, i) => call(T0 + n * 1000 + i + 1));
    const [p1, p2, p3, p4] = [batch(1), batch(2), batch(3), batch(4)];
    const a = await run(seeded.result.nextState, t1, [
      page(p1, NEXT(2)),
      page(p2, NEXT(3)),
      page(p3, NEXT(4)),
    ]);
    assertEquals(ids(a.result.events), ids([...p1, ...p2, ...p3]));
    assertEquals(a.calls.map((c) => c.url).slice(1), [NEXT(2), NEXT(3)]);
    const b = await run(a.result.nextState, t1 + 300_000, [page(p4, null)]);
    assertEquals(b.calls[0].url, NEXT(4));
    assertEquals(ids(b.result.events), ids(p4));
    assertEquals((b.result.nextState as { cursor?: number }).cursor, t1);
    const c = await run(b.result.nextState, t1 + 600_000, [page([...p4, ...p3], null)]);
    assertEquals(c.result.events, []);
  });
});
