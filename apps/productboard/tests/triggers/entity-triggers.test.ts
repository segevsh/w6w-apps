import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newEntity from "../../triggers/new-entity.ts";
import newOrUpdatedEntity from "../../triggers/new-or-updated-entity.ts";
import { clock } from "../../lib/triggers.ts";

// POST /v2/entities/search with filter.createdAt.from / filter.updatedAt.from
// (https://developer.productboard.com/openapi/entities.yaml, EntitySearchFilter).
const input = { params: {}, subscriptionId: "sub-1" };
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const URL_SEARCH = "https://api.productboard.com/v2/entities/search";
const envelope = (items: unknown[], tok?: string) => ({
  body: {
    data: items,
    links: { next: tok ? `${URL_SEARCH}?pageCursor=${tok}` : null },
  },
});
const fullPage = (n: number, stamp: string, stampKey: string, more: boolean) =>
  envelope(
    Array.from({ length: 100 }, (_, i) => ({ id: `p${n}-${i}`, [stampKey]: stamp })),
    more ? `tok${n}` : undefined,
  );
const idOf = (e: unknown) => String((e as { id: string }).id);

const cases = [
  { trigger: newEntity, field: "createdAt" },
  { trigger: newOrUpdatedEntity, field: "updatedAt" },
] as const;

for (const { trigger, field } of cases) {
  const name = trigger.key;
  const ent = (id: string, at = "2026-11-10T12:01:00Z") => ({ id, type: "feature", [field]: at });

  test(`${name}: seeds without reading or emitting`, async () => {
    clock.now = () => NOW;
    const seed = mockCtx([]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 0);
  });

  test(`${name}: sends the documented search request, emits the new entity once, retry is idempotent`, async () => {
    clock.now = () => NOW;
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
    clock.now = () => NOW + 300_000;
    const run = () => {
      const c = mockCtx([envelope([ent("e-2")])]);
      return trigger.poll!({ ...input, state: seeded.nextState }, c.ctx).then((r) => ({ r, c }));
    };
    const first = await run();
    assertEquals(first.r.events, [ent("e-2")]);
    assertEquals(first.c.calls.length, 1);
    assertEquals(first.c.calls[0].method, "POST");
    assertEquals(first.c.calls[0].url, URL_SEARCH);
    // cursor = seed time (12:00) - 10 min overlap
    assertEquals(JSON.parse(first.c.calls[0].body!), {
      data: { filter: { [field]: { from: "2026-11-10T11:50:00.000Z" } } },
    });
    assertEquals((await run()).r, first.r);
  });

  test(`${name}: records that existed at the seed are never emitted, however many pages the window holds`, async () => {
    clock.now = () => NOW;
    const seed = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
    clock.now = () => NOW + 300_000;
    const pre = "2026-11-10T11:59:00Z";
    const r1 = await trigger.poll!(
      { ...input, state: seed.nextState },
      mockCtx([1, 2, 3, 4, 5].map((k) => fullPage(k, pre, field, true))).ctx,
    );
    assertEquals(r1.events, []);
    const r2 = await trigger.poll!(
      { ...input, state: r1.nextState },
      mockCtx([fullPage(99, pre, field, false)]).ctx,
    );
    assertEquals(r2.events, []);
    clock.now = () => NOW + 600_000;
    const fresh = ent("fresh", "2026-11-10T12:06:00Z");
    const r3 = await trigger.poll!(
      { ...input, state: r2.nextState },
      mockCtx([envelope([fresh])]).ctx,
    );
    assertEquals(r3.events, [fresh]);
  });

  test(`${name}: a window of 5+1 full pages drains across two checks, none twice, and the cursor advances`, async () => {
    const start = NOW - 3_600_000;
    const state = { v: 1, kind: "ids", seeded: true, ids: ["old"], cursor: start, floor: start };
    const at = "2026-11-10T11:10:00Z";
    clock.now = () => NOW;
    const c1 = mockCtx([1, 2, 3, 4, 5].map((k) => fullPage(k, at, field, true)));
    const r1 = await trigger.poll!({ ...input, state }, c1.ctx);
    assertEquals(c1.calls.length, 5);
    assertEquals(new URL(c1.calls[1].url).searchParams.get("pageCursor"), "tok1");
    const mid = r1.nextState as { cursor?: number; resume?: unknown };
    assertEquals(mid.cursor, start);
    assertEquals(mid.resume !== undefined, true);
    clock.now = () => NOW + 300_000;
    const c2 = mockCtx([fullPage(6, at, field, false)]);
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
    assertEquals(c2.calls.length, 1);
    assertEquals(new URL(c2.calls[0].url).searchParams.get("pageCursor"), "tok5");
    const seen = [...r1.events, ...r2.events].map(idOf);
    assertEquals(seen.length, 600);
    assertEquals(new Set(seen).size, 600);
    const end = r2.nextState as { cursor?: number; resume?: unknown };
    assertEquals(end.cursor, NOW);
    assertEquals(end.resume, undefined);
  });
}

test("new-or-updated-entity: an edited entity is a new event, an untouched one is not", async () => {
  clock.now = () => NOW;
  const seeded = await newOrUpdatedEntity.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  clock.now = () => NOW + 300_000;
  const v1 = { id: "e-1", updatedAt: "2026-11-10T12:01:00Z" };
  const first = await newOrUpdatedEntity.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([envelope([v1])]).ctx,
  );
  assertEquals(first.events, [v1]);
  clock.now = () => NOW + 600_000;
  const same = await newOrUpdatedEntity.poll!(
    { ...input, state: first.nextState },
    mockCtx([envelope([v1])]).ctx,
  );
  assertEquals(same.events, []);
  const v2 = { id: "e-1", updatedAt: "2026-11-10T12:07:00Z" };
  const edited = await newOrUpdatedEntity.poll!(
    { ...input, state: first.nextState },
    mockCtx([envelope([v2])]).ctx,
  );
  assertEquals(edited.events, [v2]);
});
