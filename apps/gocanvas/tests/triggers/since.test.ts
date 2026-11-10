import { describe, test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import { clock } from "../../lib/triggers.ts";
import newSubmission from "../../triggers/new-submission.ts";
import newDispatch from "../../triggers/new-dispatch.ts";

// Since-filter polls (brief 9.1b) with the 9.8 resume and the 9.9 seed floor.
// NOW = 2026-11-10T12:00:00Z. The window starts 5 minutes before the cursor.
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
const query = (url: string) => Object.fromEntries(new URL(url).searchParams);
const pathOf = (url: string) => new URL(url).pathname;

const page = (items: unknown[], current: number, total: number) => ({
  headers: { "current-page": String(current), "total-pages": String(total), "page-items": "100" },
  body: items,
});

interface Case {
  name: string;
  t: typeof newSubmission;
  /** The endpoint the wrapped list action calls (literal, from the vendor docs). */
  path: string;
  params: Record<string, unknown>;
  /** The parent filter the request must carry, as the vendor spells it. */
  parent: Record<string, string>;
  mk: (id: string, createdAt: string | null) => Record<string, unknown>;
}

const cases: Case[] = [
  {
    name: "new-submission",
    t: newSubmission,
    path: "/api/v3/submissions",
    params: { formId: "346127" },
    parent: { form_id: "346127" },
    mk: (id, created_at) => ({ id, type: "submission", form_id: 346127, created_at, status: "x" }),
  },
  {
    name: "new-dispatch",
    t: newDispatch,
    path: "/api/v3/dispatches",
    params: { formId: "346103" },
    parent: { form_id: "346103" },
    mk: (id, created_at) => ({ id, type: "dispatch_item", form_id: 346103, created_at }),
  },
];

for (const c of cases) {
  describe(`${c.name} (since-filter poll)`, () => {
    const input = (state: unknown, params = c.params) => ({
      params,
      state,
      subscriptionId: "sub-1",
    });
    const before = iso(NOW - 60_000); // created before the seed
    const after = iso(NOW + 120_000); // created after the seed, before the next check
    const full = (n: number, total: number, createdAt: string) =>
      page(Array.from({ length: 100 }, (_, i) => c.mk(`p${n}-${i}`, createdAt)), n, total);
    const seeded = async () => {
      clock.now = () => NOW;
      return await c.t.poll!(input({}), mockCtx([]).ctx);
    };

    test("seed emits nothing, reads nothing, and records the seed time as cursor and floor", async () => {
      clock.now = () => NOW;
      const m = mockCtx([]);
      const r = await c.t.poll!(input({}), m.ctx);
      assertEquals(r.events, []);
      assertEquals(m.calls.length, 0);
      const s = r.nextState as { seeded?: boolean; cursor?: number; floor?: number };
      assertEquals(s.seeded, true);
      assertEquals(s.cursor, NOW);
      assertEquals(s.floor, NOW);
    });

    test("asks for the documented request with start_date = cursor - 5 min; emits the new record once", async () => {
      const s = await seeded();
      clock.now = () => NOW + 300_000;
      const run = () => {
        const m = mockCtx([page([c.mk("fresh", after)], 1, 1)]);
        return c.t.poll!(input(s.nextState), m.ctx).then((r) => ({ r, m }));
      };
      const first = await run();
      assertEquals(first.r.events, [c.mk("fresh", after)]);
      assertEquals(first.m.calls.length, 1);
      assertEquals(first.m.calls[0].method, "GET");
      assertEquals(pathOf(first.m.calls[0].url), c.path);
      assertEquals(query(first.m.calls[0].url), {
        page: "1",
        ...c.parent,
        start_date: "2026-11-10T11:55:00Z",
      });
      assertEquals(await run().then((x) => x.r), first.r); // a retry is identical
      const again = await c.t.poll!(
        input(first.r.nextState),
        mockCtx([page([c.mk("fresh", after)], 1, 1)]).ctx,
      );
      assertEquals(again.events, []); // the overlap re-reads it; it is not emitted twice
    });

    test("records that existed at the seed are never emitted, however many pages the window holds", async () => {
      const s = await seeded();
      clock.now = () => NOW + 300_000;
      const r1 = await c.t.poll!(
        input(s.nextState),
        mockCtx([1, 2, 3, 4, 5].map((n) => full(n, 7, before))).ctx,
      );
      assertEquals(r1.events, []);
      clock.now = () => NOW + 600_000;
      const m2 = mockCtx([full(6, 7, before), page([c.mk("old-last", before)], 7, 7)]);
      const r2 = await c.t.poll!(input(r1.nextState), m2.ctx);
      assertEquals(r2.events, []);
      // the continuation is bounded by the moment the first window started (12:05:00Z)
      assertEquals(query(m2.calls[0].url), {
        page: "6",
        ...c.parent,
        start_date: "2026-11-10T11:55:00Z",
        end_date: "2026-11-10T12:05:00Z",
      });
      clock.now = () => NOW + 900_000;
      const fresh = c.mk("fresh", iso(NOW + 840_000));
      const r3 = await c.t.poll!(input(r2.nextState), mockCtx([page([fresh], 1, 1)]).ctx);
      assertEquals(r3.events, [fresh]);
    });

    test("a window of 5+1 pages drains across two checks, none twice, then the cursor advances", async () => {
      const start = NOW - 3_600_000;
      const state = { v: 1, kind: "ids", seeded: true, ids: ["old"], cursor: start, floor: start };
      const created = iso(NOW - 1_800_000);
      clock.now = () => NOW;
      const m1 = mockCtx([1, 2, 3, 4, 5].map((n) => full(n, 6, created)));
      const r1 = await c.t.poll!(input(state), m1.ctx);
      assertEquals(m1.calls.length, 5);
      assertEquals(query(m1.calls[0].url), {
        page: "1",
        ...c.parent,
        start_date: "2026-11-10T10:55:00Z",
      });
      assertEquals(query(m1.calls[4].url), {
        page: "5",
        ...c.parent,
        start_date: "2026-11-10T10:55:00Z",
        end_date: "2026-11-10T12:00:00Z",
      });
      assertEquals(r1.events.length, 500);
      const mid = r1.nextState as { cursor?: number; resume?: unknown };
      assertEquals(mid.cursor, start); // not advanced while the window is undrained
      assert(mid.resume !== undefined);

      clock.now = () => NOW + 300_000;
      const m2 = mockCtx([
        page(Array.from({ length: 40 }, (_, i) => c.mk(`p6-${i}`, created)), 6, 6),
      ]);
      const r2 = await c.t.poll!(input(r1.nextState), m2.ctx);
      assertEquals(m2.calls.length, 1);
      assertEquals(query(m2.calls[0].url), {
        page: "6",
        ...c.parent,
        start_date: "2026-11-10T10:55:00Z", // the window's own start, not recomputed
        end_date: "2026-11-10T12:00:00Z",
      });
      const ids = [...r1.events, ...r2.events].map((e) => String((e as { id: string }).id));
      assertEquals(ids.length, 540);
      assertEquals(new Set(ids).size, 540);
      const end = r2.nextState as { cursor?: number; resume?: unknown };
      assertEquals(end.cursor, NOW);
      assertEquals(end.resume, undefined);
    });

    test("an edited record (same id) is not a new record; a record without a created_at is kept", async () => {
      const s = await seeded();
      clock.now = () => NOW + 300_000;
      const v1 = { ...c.mk("rec-1", after), revised_at: null };
      const first = await c.t.poll!(input(s.nextState), mockCtx([page([v1], 1, 1)]).ctx);
      assertEquals(first.events, [v1]);
      clock.now = () => NOW + 600_000;
      const v2 = { ...v1, revised_at: iso(NOW + 500_000), revision: true };
      const edited = await c.t.poll!(
        input(first.nextState),
        mockCtx([page([v2, c.mk("undated", null)], 1, 1)]).ctx,
      );
      assertEquals(edited.events, [c.mk("undated", null)]);
    });

    test("a record without an id is skipped", async () => {
      const s = await seeded();
      clock.now = () => NOW + 300_000;
      const noId = { type: "x", created_at: after };
      const r = await c.t.poll!(
        input(s.nextState),
        mockCtx([page([noId, { ...noId, id: null }, c.mk("ok", after)], 1, 1)]).ctx,
      );
      assertEquals(r.events, [c.mk("ok", after)]);
    });

    test("the form id is required and numeric: refused before any request, seeded or not", async () => {
      const s = await seeded();
      for (const params of [{}, { formId: "" }, { formId: "abc" }, { formId: "1.5" }]) {
        for (const state of [{}, s.nextState]) {
          const m = mockCtx([]);
          await assertRejects(
            () => c.t.poll!(input(state, params), m.ctx),
            Error,
            "must be a number",
          );
          assertEquals(m.calls.length, 0);
        }
      }
      const p = c.t.params!.find((x) => x.key === "formId")!;
      assertEquals(p.type, "string");
      assertEquals(p.required, true);
    });

    test("declares output and sample, polls every 5 minutes, has no subscription hooks, is wired", () => {
      assert(c.t.output!.length > 0);
      assert(c.t.sample !== undefined);
      assertEquals(typeof c.t.poll, "function");
      assertEquals(c.t.onSubscribe, undefined);
      assertEquals(c.t.minIntervalMs, 300_000);
      assert(app.triggers.some((t) => t.key === c.name));
    });
  });
}

describe("new-submission status", () => {
  const input = (params: Record<string, unknown>, state: unknown) => ({
    params,
    state,
    subscriptionId: "sub-1",
  });
  const run = async (params: Record<string, unknown>) => {
    clock.now = () => NOW;
    const s = await newSubmission.poll!(input(params, {}), mockCtx([]).ctx);
    clock.now = () => NOW + 300_000;
    const m = mockCtx([page([], 1, 1)]);
    await newSubmission.poll!(input(params, s.nextState), m.ctx);
    return query(m.calls[0].url);
  };

  test("empty status sends none (GoCanvas defaults to completed); a pick is passed as status", async () => {
    const start_date = "2026-11-10T11:55:00Z";
    assertEquals(await run({ formId: "346127" }), { page: "1", form_id: "346127", start_date });
    assertEquals(await run({ formId: "346127", status: " " }), {
      page: "1",
      form_id: "346127",
      start_date,
    });
    assertEquals(await run({ formId: "346127", status: "all" }), {
      page: "1",
      form_id: "346127",
      status: "all",
      start_date,
    });
  });

  test("status is a select of values the list action accepts", () => {
    const p = newSubmission.params!.find((x) => x.key === "status")!;
    assertEquals(p.type, "select");
    assertEquals(p.options!.map((o) => o.value), ["completed", "all", "in-progress"]);
  });
});
