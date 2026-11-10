import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-or-updated-task.ts";

const input = { params: { taskList: "list-1" }, subscriptionId: "sub-1" };
const task = (id: string, updated = "2026-11-09T10:30:00Z") => ({
  id,
  title: `Task ${id}`,
  updated,
});
const at = (iso: string) => {
  clock.now = () => Date.parse(iso);
};

test("new-or-updated-task: seeds, emits updates, retries idempotently, and uses updatedMin", async () => {
  const originalNow = clock.now;
  at("2026-11-09T10:00:00Z");
  try {
    const seededCtx = mockCtx([]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seededCtx.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seededCtx.calls.length, 0);
    const page = [task("b"), task("a", "2026-11-09T09:59:00Z")];
    const firstCtx = mockCtx([{ body: { items: page } }]);
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, firstCtx.ctx);
    const retry = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: { items: page } }]).ctx,
    );
    assertEquals(firstCtx.calls[0].method, "GET");
    assertEquals(
      firstCtx.calls[0].url,
      "https://tasks.googleapis.com/tasks/v1/lists/list-1/tasks?updatedMin=2026-11-09T09%3A58%3A00.000Z&maxResults=100",
    );
    assertEquals(first.events, [task("b")]);
    assertEquals(retry, first);
  } finally {
    clock.now = originalNow;
  }
});

test("new-or-updated-task: an edit (same id, newer updated) emits exactly one event", async () => {
  const originalNow = clock.now;
  at("2026-11-09T10:00:00Z");
  try {
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
    at("2026-11-09T10:40:00Z");
    const created = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: { items: [task("a")] } }]).ctx,
    );
    assertEquals(created.events, [task("a")]);
    const edited = { ...task("a"), updated: "2026-11-09T10:45:00Z" };
    at("2026-11-09T10:50:00Z");
    const result = await trigger.poll!(
      { ...input, state: created.nextState },
      mockCtx([{ body: { items: [edited, task("a")] } }]).ctx,
    );
    assertEquals(result.events, [edited]);
  } finally {
    clock.now = originalNow;
  }
});

const full = (n: number, more: boolean) => ({
  body: {
    items: Array.from({ length: 100 }, (_, i) => task(`p${n}-${i}`, "2026-11-09T11:10:00Z")),
    ...(more ? { nextPageToken: `tok${n}` } : {}),
  },
});

test("new-or-updated-task: tasks that existed at the seed are never emitted, however many pages the window holds", async () => {
  const originalNow = clock.now;
  try {
    at("2026-11-09T12:00:00Z");
    const seed = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
    assertEquals(seed.events, []);
    at("2026-11-09T12:05:00Z");
    const old = (n: number, more: boolean) => ({
      body: {
        items: Array.from({ length: 100 }, (_, i) => task(`o${n}-${i}`, "2026-11-09T11:59:00Z")),
        ...(more ? { nextPageToken: `t${n}` } : {}),
      },
    });
    const r1 = await trigger.poll!(
      { ...input, state: seed.nextState },
      mockCtx([1, 2, 3, 4, 5].map((n) => old(n, true))).ctx,
    );
    assertEquals(r1.events, []);
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, mockCtx([old(6, false)]).ctx);
    assertEquals(r2.events, []);
    at("2026-11-09T12:10:00Z");
    const fresh = task("fresh", "2026-11-09T12:06:00Z");
    const r3 = await trigger.poll!(
      { ...input, state: r2.nextState },
      mockCtx([{ body: { items: [fresh] } }]).ctx,
    );
    assertEquals(r3.events, [fresh]);
  } finally {
    clock.now = originalNow;
  }
});

test("new-or-updated-task: a window of six full pages is emitted once across two checks and the cursor advances after the drain", async () => {
  const originalNow = clock.now;
  const start = Date.parse("2026-11-09T11:00:00Z");
  const state = { v: 1, kind: "ids", seeded: true, ids: ["old"], cursor: start };
  const seen: string[] = [];
  try {
    at("2026-11-09T11:30:00Z");
    const c1 = mockCtx([1, 2, 3, 4, 5].map((n) => full(n, true)));
    const r1 = await trigger.poll!({ ...input, state }, c1.ctx);
    assertEquals(c1.calls.length, 5);
    seen.push(...r1.events.map((e) => String((e as { id: string }).id)));
    const mid = r1.nextState as { cursor?: number; resume?: { pos?: string } };
    assertEquals(mid.resume?.pos, "tok5");
    assertEquals(mid.cursor, start);
    at("2026-11-09T11:35:00Z");
    const c2 = mockCtx([full(6, false)]);
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
    assertEquals(new URL(c2.calls[0].url).searchParams.get("pageToken"), "tok5");
    seen.push(...r2.events.map((e) => String((e as { id: string }).id)));
    const next = r2.nextState as { cursor?: number; resume?: unknown };
    assertEquals(next.cursor, Date.parse("2026-11-09T11:30:00Z"));
    assertEquals(next.resume, undefined);
    assertEquals(seen.length, 600);
    assertEquals(new Set(seen).size, 600);
  } finally {
    clock.now = originalNow;
  }
});
