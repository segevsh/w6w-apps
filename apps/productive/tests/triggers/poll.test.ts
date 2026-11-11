import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock, pollTriggers } from "../../triggers/poll.ts";

const API = "https://api.productive.io/api/v2/";
const page = "page%5Bsize%5D=100&page%5Bnumber%5D=1";
// Shape (a): newest-first on a sort the vendor documents (developer.productive.io/openapi.yaml).
const newest: Record<string, string> = {
  "new-comment": `comments?sort=-created_at&${page}`,
  "new-company": `companies?sort=-created_at&${page}`,
  "new-deal-status": `deal_statuses?sort=-created_at&${page}`,
  "new-invoice": `invoices?sort=-created_at&${page}`,
  "new-page": `pages?sort=-created_at&${page}`,
  "new-project": `projects?sort=-created_at&${page}`,
  "new-task": `tasks?sort=-created_at&${page}`,
  "new-or-updated-page": `pages?sort=-updated_at&${page}`,
  "new-or-updated-task": `tasks?sort=-updated_at&${page}`,
  "new-or-updated-time-entry": `time_entries?sort=-updated_at&${page}`,
};
// Shape (b): date since-filter, `gt_eq` = the UTC day before (cursor - 120 s).
const since: Record<string, { path: string; stamp: string }> = {
  "new-booking": { path: "bookings", stamp: "created_at" },
  "new-person": { path: "people", stamp: "created_at" },
  "new-or-updated-booking": { path: "bookings", stamp: "updated_at" },
};
const T0 = Date.parse("2026-11-10T12:00:00Z");
const input = { params: {}, subscriptionId: "sub-1" };

type Row = Record<string, string>;
const body = (rows: Row[], hasMore = false) => ({
  data: rows.map(({ id, ...attributes }) => ({ id, type: "records", attributes })),
  meta: { total_count: rows.length, current_page: 1, total_pages: 1, page_size: 100 },
  links: hasMore ? { next: "https://api.productive.io/api/v2/x?page%5Bnumber%5D=2" } : {},
});
const idOf = (e: unknown) => String((e as { id: string }).id);
const url = (suffix: string) => `${API}${suffix}`;

test("every poll trigger is covered by exactly one table", () => {
  assertEquals(
    pollTriggers.map((t) => t.key).sort(),
    [...Object.keys(newest), ...Object.keys(since)].sort(),
  );
});

for (const trigger of pollTriggers.filter((t) => t.key in newest)) {
  const updated = trigger.key.startsWith("new-or-updated-");
  const mk = (id: string, stamp = "2026-11-10T11:00:00Z"): Row => ({ id, updated_at: stamp });

  test(`${trigger.key}: seeds, emits, retries idempotently, and requests its literal sorted page`, async () => {
    const seed = mockCtx([{ status: 200, body: body([mk("a")]) }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url(newest[trigger.key]));
    const rows = [mk("b"), mk("a")];
    const first = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ status: 200, body: body(rows) }]).ctx,
    );
    const retry = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ status: 200, body: body(rows) }]).ctx,
    );
    assertEquals(first.events.map(idOf), ["b"]);
    assertEquals(retry, first);
  });

  test(`${trigger.key}: an edited record ${updated ? "is" : "is not"} emitted again`, async () => {
    const seeded = await trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ status: 200, body: body([mk("a", "2026-11-10T11:00:00Z")]) }]).ctx,
    );
    const edited = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ status: 200, body: body([mk("a", "2026-11-10T11:30:00Z")]) }]).ctx,
    );
    assertEquals(edited.events.map(idOf), updated ? ["a"] : []);
    const same = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ status: 200, body: body([mk("a", "2026-11-10T11:00:00Z")]) }]).ctx,
    );
    assertEquals(same.events, []);
  });
}

for (const trigger of pollTriggers.filter((t) => t.key in since)) {
  const { path, stamp } = since[trigger.key];
  const updated = stamp === "updated_at";
  const mk = (id: string, iso: string): Row => ({ id, [stamp]: iso });
  const full = (n: number, iso: string, more: boolean) =>
    body(Array.from({ length: 100 }, (_, i) => mk(`p${n}-${i}`, iso)), more);
  const ok = (b: unknown) => ({ status: 200, body: b });
  const filter = (day: string, n: number) =>
    url(
      `${path}?filter%5B${stamp}%5D%5Bgt_eq%5D=${day}&page%5Bsize%5D=100&page%5Bnumber%5D=${n}`,
    );
  const restore = clock.now;
  const at = (iso: string) => {
    clock.now = () => Date.parse(iso);
  };

  test(`${trigger.key}: seeds without reading, emits a new record, retries idempotently, and requests the literal date filter`, async () => {
    try {
      clock.now = () => T0;
      const seed = mockCtx([]);
      const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals(seed.calls.length, 0);
      clock.now = () => T0 + 300_000;
      const rows = [mk("b", "2026-11-10T12:03:00Z"), mk("a", "2026-11-10T11:59:00Z")];
      const c = mockCtx([ok(body(rows))]);
      const first = await trigger.poll!({ ...input, state: seeded.nextState }, c.ctx);
      const retry = await trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([ok(body(rows))]).ctx,
      );
      assertEquals(first.events.map(idOf), ["b"]);
      assertEquals(retry, first);
      assertEquals(c.calls[0].method, "GET");
      assertEquals(c.calls[0].url, filter("2026-11-09", 1));
    } finally {
      clock.now = restore;
    }
  });

  test(`${trigger.key}: an edited record ${updated ? "is" : "is not"} emitted again`, async () => {
    try {
      clock.now = () => T0;
      const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
      clock.now = () => T0 + 300_000;
      const v1 = mk("a", "2026-11-10T12:01:00Z");
      const first = await trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([ok(body([v1]))]).ctx,
      );
      assertEquals(first.events.map(idOf), ["a"]);
      clock.now = () => T0 + 600_000;
      const v2 = { ...mk("a", "2026-11-10T12:07:00Z"), created_at: "2026-11-10T12:01:00Z" };
      const edit = await trigger.poll!(
        { ...input, state: first.nextState },
        mockCtx([ok(body([v2]))]).ctx,
      );
      assertEquals(edit.events.map(idOf), updated ? ["a"] : []);
      const repeat = await trigger.poll!(
        { ...input, state: first.nextState },
        mockCtx([ok(body([v1]))]).ctx,
      );
      assertEquals(repeat.events, []);
    } finally {
      clock.now = restore;
    }
  });

  test(`${trigger.key}: records that existed at the seed are never emitted, however many pages the window holds`, async () => {
    try {
      at("2026-11-09T12:00:00Z");
      const seed = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
      at("2026-11-09T12:05:00Z");
      const old = "2026-11-09T11:59:00Z";
      const c1 = mockCtx([1, 2, 3, 4, 5].map((k) => ok(full(k, old, true))));
      const r1 = await trigger.poll!({ ...input, state: seed.nextState }, c1.ctx);
      assertEquals(r1.events, []);
      assertEquals(c1.calls.map((x) => x.url), [1, 2, 3, 4, 5].map((n) => filter("2026-11-08", n)));
      const c2 = mockCtx([ok(full(99, old, false))]);
      const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
      assertEquals(r2.events, []);
      assertEquals(c2.calls[0].url, filter("2026-11-08", 6));
      at("2026-11-09T12:10:00Z");
      const fresh = mk("fresh", "2026-11-09T12:06:00Z");
      const r3 = await trigger.poll!(
        { ...input, state: r2.nextState },
        mockCtx([ok(body([fresh]))]).ctx,
      );
      assertEquals(r3.events.map(idOf), ["fresh"]);
    } finally {
      clock.now = restore;
    }
  });

  test(`${trigger.key}: a window of 5+1 full pages is emitted once across two checks and the cursor advances after the drain`, async () => {
    const start = Date.parse("2026-11-09T11:00:00Z");
    const state = { v: 1, kind: "ids", seeded: true, ids: ["old"], cursor: start };
    const seen: string[] = [];
    try {
      at("2026-11-09T11:30:00Z");
      const c1 = mockCtx([1, 2, 3, 4, 5].map((k) => ok(full(k, "2026-11-09T11:10:00Z", true))));
      const r1 = await trigger.poll!({ ...input, state }, c1.ctx);
      assertEquals(c1.calls.length, 5);
      assertEquals(c1.calls[0].url, filter("2026-11-08", 1));
      seen.push(...r1.events.map(idOf));
      const mid = r1.nextState as { cursor?: number; resume?: { pos?: unknown } };
      assertEquals(mid.resume?.pos, 6);
      assertEquals(mid.cursor, start);
      at("2026-11-09T11:35:00Z");
      const c2 = mockCtx([ok(full(6, "2026-11-09T11:12:00Z", false))]);
      const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
      assertEquals(c2.calls.length, 1);
      assertEquals(c2.calls[0].url, filter("2026-11-08", 6));
      seen.push(...r2.events.map(idOf));
      const next = r2.nextState as { cursor?: number; resume?: unknown };
      assertEquals(next.cursor, Date.parse("2026-11-09T11:30:00Z"));
      assertEquals(next.resume, undefined);
      assertEquals(seen.length, 600);
      assertEquals(new Set(seen).size, 600);
    } finally {
      clock.now = restore;
    }
  });
}
