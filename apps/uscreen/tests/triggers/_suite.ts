import { test } from "node:test";
import type { TriggerDefinition } from "@w6w/types";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";

/** 2026-11-09T00:00:00Z */
export const T0 = 1_794_182_400_000;
const JSON_HEADERS = { "content-type": "application/json" };

const idsOf = (events: unknown[]) => events.map((e) => (e as { id: number }).id);

/** The §5 / §9.8 / §9.9 cases shared by the Uscreen since-filter triggers. */
export function sinceSuite(
  name: string,
  trigger: TriggerDefinition,
  /** The literal request URL prefix, up to and including the path. */
  base: string,
) {
  const item = (id: number, createdSec = T0 / 1000 + 30) => ({ id, created_at: createdSec });
  const page = (items: unknown[], next?: number) => ({
    body: items,
    headers: {
      ...JSON_HEADERS,
      ...(next ? { link: `<${base}?page=${next}>; rel="next"` } : {}),
    },
  });
  const poll = async (state: unknown, responses: ReturnType<typeof page>[]) => {
    const m = mockCtx(responses);
    const r = await trigger.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx);
    return { r, calls: m.calls };
  };
  const cur = (s: unknown) => (s as { cursor?: string }).cursor;
  const win = "from=2026-11-08T23%3A58%3A00.000Z&date_field=created_at";

  test(`${name}: seeds, emits only new items, retries idempotently, literal request`, async () => {
    clock.now = () => T0;
    const seeded = await poll({}, [page([item(1)])]);
    assertEquals(seeded.r.events, []);
    assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seeded.calls[0].method, "GET");
    assertEquals(seeded.calls[0].url, `${base}?${win}&page=1`);
    const response = page([item(2), item(1)]);
    const first = await poll(seeded.r.nextState, [response]);
    const retry = await poll(seeded.r.nextState, [response]);
    assertEquals(idsOf(first.r.events), [2]);
    assertEquals(retry.r, first.r);
  });

  test(`${name}: re-reads the cursor minus the overlap on the next check`, async () => {
    clock.now = () => T0;
    const seeded = await poll({}, [page([item(1)])]);
    assertEquals(cur(seeded.r.nextState), "2026-11-09T00:00:00.000Z");
    clock.now = () => T0 + 300_000;
    const next = await poll(seeded.r.nextState, [page([item(1)])]);
    assertEquals(next.calls[0].url, `${base}?${win}&page=1`);
    assertEquals(cur(next.r.nextState), "2026-11-09T00:05:00.000Z");
  });

  test(`${name}: drains a window of more pages than one check reads, each record once`, async () => {
    clock.now = () => T0;
    const seeded = await poll({}, [page([item(1)])]);
    clock.now = () => T0 + 300_000;
    const c1 = await poll(seeded.r.nextState, [page([item(4), item(3), item(2)], 2)]);
    clock.now = () => T0 + 600_000;
    const c2 = await poll(c1.r.nextState, [page([item(7), item(6), item(5)], 3)]);
    clock.now = () => T0 + 900_000;
    const c3 = await poll(c2.r.nextState, [page([item(8)])]);
    assertEquals(idsOf(c1.r.events), [2, 3, 4]);
    assertEquals(idsOf(c2.r.events), [5, 6, 7]);
    assertEquals(idsOf(c3.r.events), [8]);
    assertEquals(c1.calls[0].url, `${base}?${win}&page=1`);
    assertEquals(c2.calls[0].url, `${base}?${win}&page=2`);
    assertEquals(c3.calls[0].url, `${base}?${win}&page=3`);
    assertEquals(cur(c1.r.nextState), cur(seeded.r.nextState));
    assertEquals(cur(c2.r.nextState), cur(seeded.r.nextState));
    assertEquals(cur(c3.r.nextState), "2026-11-09T00:05:00.000Z");
    assertEquals((c3.r.nextState as { resume?: unknown }).resume, undefined);
  });

  test(`${name}: never emits a record created before the seed, however many pages`, async () => {
    const old = (id: number) => item(id, T0 / 1000 - 60);
    clock.now = () => T0;
    const seeded = await poll({}, [page([old(1)])]);
    assertEquals(seeded.r.events, []);
    clock.now = () => T0 + 300_000;
    const c1 = await poll(seeded.r.nextState, [page([old(2), old(3), old(4)], 2)]);
    clock.now = () => T0 + 600_000;
    const c2 = await poll(c1.r.nextState, [page([old(5), old(6), old(7)], 3)]);
    clock.now = () => T0 + 900_000;
    const c3 = await poll(c2.r.nextState, [page([old(8), old(9), old(10)], 4)]);
    assertEquals(c1.r.events, []);
    assertEquals(c2.r.events, []);
    assertEquals(c3.r.events, []);
    clock.now = () => T0 + 1_200_000;
    const fresh = item(99, T0 / 1000 + 1000);
    const c4 = await poll(c3.r.nextState, [page([fresh, old(11)])]);
    assertEquals(c4.r.events, [fresh]);
  });
}
