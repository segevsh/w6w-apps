import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newProject from "../../triggers/new-project.ts";
import newOrUpdatedProject from "../../triggers/new-or-updated-project.ts";
import newPhoto from "../../triggers/new-photo.ts";
import newVideo from "../../triggers/new-video.ts";
import { clock } from "../../lib/triggers.ts";

// Since-filter triggers (brief 9.1b) with the 9.8 resume and 9.9 seed floor.
// NOW = 2026-11-10T12:00:00Z, SEC the same instant in Unix seconds.
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const SEC = 1794312000;
const input = { params: {}, subscriptionId: "sub-1" };
const ROOT = "https://api.companycam.com/v2";
const rec = (id: string, key: string, sec: number) => ({ id, [key]: sec });
const idOf = (e: unknown) => String((e as { id: string }).id);
const query = (url: string) => Object.fromEntries(new URL(url).searchParams);

const cases = [
  {
    trigger: newProject,
    stamp: "created_at",
    path: "/projects",
    paging: "page",
    // cursor = seed time (12:00) - 10 min overlap
    filter: { modified_since: "2026-11-10T11:50:00.000Z" },
  },
  {
    trigger: newOrUpdatedProject,
    stamp: "updated_at",
    path: "/projects",
    paging: "page",
    filter: { modified_since: "2026-11-10T11:50:00.000Z" },
  },
  {
    trigger: newPhoto,
    stamp: "created_at",
    path: "/photos",
    paging: "cursor",
    // cursor = seed time (12:00) - 2 h overlap = 10:00:00Z
    filter: { start_date: String(SEC - 7200) },
  },
  {
    trigger: newVideo,
    stamp: "created_at",
    path: "/videos",
    paging: "page",
    filter: { start_date: String(SEC - 7200) },
  },
] as const;

for (const { trigger, stamp, path, paging, filter } of cases) {
  const name = trigger.key;
  const page = (items: unknown[], cur?: string) => ({
    body: items,
    headers: { "content-type": "application/json", ...(cur ? { "x-next-cursor": cur } : {}) },
  });
  const full = (n: number, sec: number, more: boolean) =>
    page(
      Array.from({ length: 100 }, (_, i) => rec(`p${n}-${i}`, stamp, sec)),
      more && paging === "cursor" ? `cur${n}` : undefined,
    );
  // The last page of a drain: a short page ends page-number paging; a missing cursor ends cursors.
  const lastSize = paging === "page" ? 99 : 100;
  const last = (n: number, sec: number) =>
    page(Array.from({ length: lastSize }, (_, i) => rec(`p${n}-${i}`, stamp, sec)));
  const seeded = async () => {
    clock.now = () => NOW;
    return await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  };

  test(`${name}: seeds without reading or emitting`, async () => {
    clock.now = () => NOW;
    const c = mockCtx([]);
    const r = await trigger.poll!({ ...input, state: {} }, c.ctx);
    assertEquals(r.events, []);
    assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(c.calls.length, 0);
  });

  test(`${name}: sends the documented request with the date filter, emits the new record once`, async () => {
    const s = await seeded();
    clock.now = () => NOW + 300_000;
    const run = () => {
      const c = mockCtx([page([rec("fresh", stamp, SEC + 120)])]);
      return trigger.poll!({ ...input, state: s.nextState }, c.ctx).then((r) => ({ r, c }));
    };
    const first = await run();
    assertEquals(first.r.events, [rec("fresh", stamp, SEC + 120)]);
    assertEquals(first.c.calls.length, 1);
    assertEquals(first.c.calls[0].method, "GET");
    assertEquals(
      new URL(first.c.calls[0].url).origin + new URL(first.c.calls[0].url).pathname,
      `${ROOT}${path}`,
    );
    assertEquals(
      query(first.c.calls[0].url),
      paging === "page"
        ? { page: "1", per_page: "100", ...filter }
        : { per_page: "100", ...filter },
    );
    assertEquals((await run()).r, first.r);
  });

  test(`${name}: records that existed at the seed are never emitted, however many pages the window holds`, async () => {
    const s = await seeded();
    clock.now = () => NOW + 300_000;
    const r1 = await trigger.poll!(
      { ...input, state: s.nextState },
      mockCtx([1, 2, 3, 4, 5].map((k) => full(k, SEC - 60, true))).ctx,
    );
    assertEquals(r1.events, []);
    const r2 = await trigger.poll!(
      { ...input, state: r1.nextState },
      mockCtx([last(99, SEC - 30)]).ctx,
    );
    assertEquals(r2.events, []);
    clock.now = () => NOW + 600_000;
    const fresh = rec("fresh", stamp, SEC + 360);
    const r3 = await trigger.poll!(
      { ...input, state: r2.nextState },
      mockCtx([page([fresh])]).ctx,
    );
    assertEquals(r3.events, [fresh]);
  });

  test(`${name}: a window of 5+1 full pages drains across two checks, none twice, cursor advances`, async () => {
    const start = NOW - 3_600_000;
    const state = { v: 1, kind: "ids", seeded: true, ids: ["old"], cursor: start, floor: start };
    clock.now = () => NOW;
    const c1 = mockCtx([1, 2, 3, 4, 5].map((k) => full(k, SEC - 1800, true)));
    const r1 = await trigger.poll!({ ...input, state }, c1.ctx);
    assertEquals(c1.calls.length, 5);
    assertEquals(
      query(c1.calls[1].url)[paging === "page" ? "page" : "after"],
      paging === "page" ? "2" : "cur1",
    );
    const mid = r1.nextState as { cursor?: number; resume?: unknown };
    assertEquals(mid.cursor, start);
    assertEquals(mid.resume !== undefined, true);
    clock.now = () => NOW + 300_000;
    const c2 = mockCtx([last(6, SEC - 1700)]);
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
    assertEquals(c2.calls.length, 1);
    assertEquals(
      query(c2.calls[0].url)[paging === "page" ? "page" : "after"],
      paging === "page" ? "6" : "cur5",
    );
    const seen = [...r1.events, ...r2.events].map(idOf);
    assertEquals(seen.length, 500 + lastSize);
    assertEquals(new Set(seen).size, 500 + lastSize);
    const end = r2.nextState as { cursor?: number; resume?: unknown };
    assertEquals(end.cursor, NOW);
    assertEquals(end.resume, undefined);
  });
}

test("new-or-updated-project: an edited project is a new event, an untouched one is not", async () => {
  clock.now = () => NOW;
  const s = await newOrUpdatedProject.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  clock.now = () => NOW + 300_000;
  const v1 = { id: "pr-1", updated_at: SEC + 60 };
  const first = await newOrUpdatedProject.poll!(
    { ...input, state: s.nextState },
    mockCtx([{ body: [v1] }]).ctx,
  );
  assertEquals(first.events, [v1]);
  clock.now = () => NOW + 600_000;
  const same = await newOrUpdatedProject.poll!(
    { ...input, state: first.nextState },
    mockCtx([{ body: [v1] }]).ctx,
  );
  assertEquals(same.events, []);
  const v2 = { id: "pr-1", updated_at: SEC + 400 };
  const edited = await newOrUpdatedProject.poll!(
    { ...input, state: first.nextState },
    mockCtx([{ body: [v2] }]).ctx,
  );
  assertEquals(edited.events, [v2]);
});
