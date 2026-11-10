import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newCanvas from "../../triggers/new-canvas.ts";
import newSegment from "../../triggers/new-segment.ts";
import newCatalog from "../../triggers/new-catalog.ts";
import updatedCanvas from "../../triggers/new-or-updated-canvas.ts";
import newContentBlock from "../../triggers/new-content-block.ts";
import updatedContentBlock from "../../triggers/new-or-updated-content-block.ts";
import newUnsubscribe from "../../triggers/new-email-unsubscribe.ts";
import newHardBounce from "../../triggers/new-email-hard-bounce.ts";
import newInvalidPhone from "../../triggers/new-invalid-phone-number.ts";

const opts = { display: { instance: "iad-01" } };
const HOST = "https://rest.iad-01.braze.com";
const input = { params: {}, subscriptionId: "sub-1" };
const T0 = Date.parse("2026-11-10T12:00:00Z");
const OLD = T0 - 3_600_000;
const MAX_PAGES = 5;
const iso = (ms: number) => new Date(ms).toISOString();
let seq = 0;

type Trigger = typeof newCanvas;
const run = (trigger: Trigger, state: unknown, responses: MockResponse[]) => {
  const m = mockCtx(responses, opts);
  return trigger.poll!({ ...input, state }, m.ctx).then((r) => ({ ...r, calls: m.calls }));
};

describe("newest-first lists", () => {
  const cases = [
    {
      name: "new-canvas",
      trigger: newCanvas,
      key: "canvases",
      url: `${HOST}/canvas/list?page=0&include_archived=false&sort_direction=desc`,
    },
    {
      name: "new-segment",
      trigger: newSegment,
      key: "segments",
      url: `${HOST}/segments/list?page=0&sort_direction=desc`,
    },
  ] as const;
  for (const c of cases) {
    test(`${c.name}: seeds, emits only the new record, retries idempotently, requests sort_direction=desc`, async () => {
      const seed = await run(c.trigger, {}, [{ body: { [c.key]: [{ id: "a" }] } }]);
      assertEquals(seed.events, []);
      assertEquals((seed.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url);
      const body = { [c.key]: [{ id: "b" }, { id: "a" }] };
      const first = await run(c.trigger, seed.nextState, [{ body }]);
      const retry = await run(c.trigger, seed.nextState, [{ body }]);
      assertEquals(first.events, [{ id: "b" }]);
      assertEquals(retry.events, first.events);
    });
  }
});

describe("new-catalog (snapshot)", () => {
  test("seeds, emits only the added catalog, ignores edits, retries idempotently", async () => {
    const seed = await run(newCatalog, {}, [{ body: { catalogs: [{ name: "a" }] } }]);
    assertEquals(seed.events, []);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, `${HOST}/catalogs`);
    const body = { catalogs: [{ name: "a", description: "edited" }, { name: "b" }] };
    const first = await run(newCatalog, seed.nextState, [{ body }]);
    const retry = await run(newCatalog, seed.nextState, [{ body }]);
    assertEquals(first.events, [{ name: "b" }]);
    assertEquals(retry.events, first.events);
  });
});

interface WindowCase {
  name: string;
  trigger: Trigger;
  key: string;
  pageSize: number;
  rec(createdMs: number, edited?: number): Record<string, unknown>;
  seedUrl: string;
  resumeUrl: string;
}
const seedQuery = "2026-11-10T11%3A58%3A00Z";
const dated = "start_date=2026-11-10&end_date=2026-11-11";
const windowCases: WindowCase[] = [
  {
    name: "new-or-updated-canvas",
    trigger: updatedCanvas,
    key: "canvases",
    pageSize: 100,
    rec: (c) => ({ id: `cv-${++seq}`, name: "n", last_edited: iso(c) }),
    seedUrl:
      `${HOST}/canvas/list?page=0&include_archived=false&last_edit.time%5Bgt%5D=${seedQuery}`,
    resumeUrl:
      `${HOST}/canvas/list?page=5&include_archived=false&last_edit.time%5Bgt%5D=${seedQuery}`,
  },
  {
    name: "new-content-block",
    trigger: newContentBlock,
    key: "content_blocks",
    pageSize: 100,
    rec: (c) => ({ content_block_id: `cb-${++seq}`, created_at: iso(c), last_edited: iso(c) }),
    seedUrl: `${HOST}/content_blocks/list?modified_after=${seedQuery}&limit=100&offset=0`,
    resumeUrl: `${HOST}/content_blocks/list?modified_after=${seedQuery}&limit=100&offset=500`,
  },
  {
    name: "new-or-updated-content-block",
    trigger: updatedContentBlock,
    key: "content_blocks",
    pageSize: 100,
    rec: (c) => ({ content_block_id: `cb-${++seq}`, created_at: iso(c), last_edited: iso(c) }),
    seedUrl: `${HOST}/content_blocks/list?modified_after=${seedQuery}&limit=100&offset=0`,
    resumeUrl: `${HOST}/content_blocks/list?modified_after=${seedQuery}&limit=100&offset=500`,
  },
  {
    name: "new-email-unsubscribe",
    trigger: newUnsubscribe,
    key: "emails",
    pageSize: 500,
    rec: (c) => ({ email: `u${++seq}@example.com`, unsubscribed_at: iso(c) }),
    seedUrl: `${HOST}/email/unsubscribes?${dated}&limit=500&offset=0&sort_direction=asc`,
    resumeUrl: `${HOST}/email/unsubscribes?${dated}&limit=500&offset=2500&sort_direction=asc`,
  },
  {
    name: "new-email-hard-bounce",
    trigger: newHardBounce,
    key: "emails",
    pageSize: 500,
    rec: (c) => ({ email: `b${++seq}@example.com`, hard_bounced_at: iso(c) }),
    seedUrl: `${HOST}/email/hard_bounces?${dated}&limit=500&offset=0`,
    resumeUrl: `${HOST}/email/hard_bounces?${dated}&limit=500&offset=2500`,
  },
  {
    name: "new-invalid-phone-number",
    trigger: newInvalidPhone,
    key: "sms",
    pageSize: 500,
    rec: (c) => ({ phone: `+1555${++seq}`, invalid_detected_at: iso(c), reason: "deactivated" }),
    seedUrl:
      `${HOST}/sms/invalid_phone_numbers?start_date=2026-11-10&end_date=2026-11-10&limit=500&offset=0`,
    resumeUrl:
      `${HOST}/sms/invalid_phone_numbers?start_date=2026-11-10&end_date=2026-11-10&limit=500&offset=2500`,
  },
];

describe("since-filter windows", () => {
  for (const c of windowCases) {
    const page = (items: unknown[]): MockResponse => ({ body: { [c.key]: items } });
    const full = (created: number): MockResponse =>
      page(Array.from({ length: c.pageSize }, () => c.rec(created)));
    const seed = async () => {
      clock.now = () => T0;
      const seeded = await run(c.trigger, {}, [page([c.rec(OLD)])]);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { floor?: number }).floor, T0);
      assertEquals(seeded.calls[0].method, "GET");
      assertEquals(seeded.calls[0].url, c.seedUrl);
      return seeded.nextState;
    };

    test(`${c.name}: seeds, emits only the record since the last check, retries idempotently`, async () => {
      const state = await seed();
      clock.now = () => T0 + 300_000;
      const fresh = c.rec(T0 + 100_000);
      const responses = [page([c.rec(OLD), fresh])];
      const first = await run(c.trigger, state, responses);
      const retry = await run(c.trigger, state, responses);
      assertEquals(first.events, [fresh]);
      assertEquals(retry.events, first.events);
      assertEquals(retry.nextState, first.nextState);
    });

    test(`${c.name}: records older than the seed never fire, even over more than maxPages full pages`, async () => {
      const state = await seed();
      clock.now = () => T0 + 300_000;
      const r1 = await run(c.trigger, state, Array.from({ length: MAX_PAGES }, () => full(OLD)));
      assertEquals(r1.calls.length, MAX_PAGES);
      assertEquals(r1.events, []);
      clock.now = () => T0 + 600_000;
      const r2 = await run(c.trigger, r1.nextState, [page([c.rec(OLD)])]);
      assertEquals(r2.events, []);
      clock.now = () => T0 + 900_000;
      const fresh = c.rec(T0 + 400_000);
      const r3 = await run(c.trigger, r2.nextState, [page([c.rec(OLD), fresh])]);
      assertEquals(r3.events, [fresh]);
    });

    test(`${c.name}: a window of maxPages + 1 pages is emitted once across checks, cursor advances after the drain`, async () => {
      const state = await seed();
      clock.now = () => T0 + 300_000;
      const created = T0 + 100_000;
      const r1 = await run(
        c.trigger,
        state,
        Array.from({ length: MAX_PAGES }, () => full(created)),
      );
      assertEquals(r1.calls.length, MAX_PAGES);
      assertEquals(r1.events.length, MAX_PAGES * c.pageSize);
      const n1 = r1.nextState as { cursor?: number; resume?: { pos?: number } };
      assertEquals(n1.cursor, T0);
      assertEquals(n1.resume?.pos, MAX_PAGES * c.pageSize);
      clock.now = () => T0 + 600_000;
      const r2 = await run(c.trigger, r1.nextState, [page([c.rec(created)])]);
      assertEquals(r2.calls[0].url, c.resumeUrl);
      assertEquals(r2.events.length, 1);
      const n2 = r2.nextState as { cursor?: number; resume?: unknown };
      assertEquals(n2.cursor, T0 + 300_000);
      assertEquals(n2.resume, undefined);
      const all = [...r1.events, ...r2.events].map((e) => JSON.stringify(e));
      assertEquals(new Set(all).size, MAX_PAGES * c.pageSize + 1);
    });
  }

  test("new-or-updated-canvas: an edited canvas is a new event", async () => {
    clock.now = () => T0;
    const seeded = await run(updatedCanvas, {}, [{ body: { canvases: [] } }]);
    clock.now = () => T0 + 300_000;
    const edited = { id: "cv-edit", name: "n", last_edited: iso(T0 + 200_000) };
    const out = await run(updatedCanvas, seeded.nextState, [{ body: { canvases: [edited] } }]);
    assertEquals(out.events, [edited]);
    clock.now = () => T0 + 600_000;
    const again = { ...edited, last_edited: iso(T0 + 500_000) };
    const out2 = await run(updatedCanvas, out.nextState, [{ body: { canvases: [again, edited] } }]);
    assertEquals(out2.events, [again]);
  });
});
