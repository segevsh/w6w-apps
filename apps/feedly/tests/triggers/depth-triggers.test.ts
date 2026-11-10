import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newAiFeed from "../../triggers/new-ai-feed.ts";
import newBoard from "../../triggers/new-board.ts";
import newEnterpriseUser from "../../triggers/new-enterprise-user.ts";
import newFolder from "../../triggers/new-folder.ts";
import newSearchArticle from "../../triggers/new-search-article.ts";

const snapshots = [
  {
    trigger: newBoard,
    path: "/v3/enterprise/tags",
    wrap: (rows: unknown[]) => rows,
    a: { id: "b1", label: "One" },
    b: { id: "b2", label: "Two" },
  },
  {
    trigger: newFolder,
    path: "/v3/enterprise/collections",
    wrap: (rows: unknown[]) => rows,
    a: { id: "c1", label: "One", feeds: [] },
    b: { id: "c2", label: "Two", feeds: [] },
  },
  {
    trigger: newAiFeed,
    path: "/v3/alerts",
    wrap: (rows: unknown[]) => ({ enterpriseAlerts: rows, userAlerts: [{ feedId: "private-1" }] }),
    a: { feedId: "f1", name: "One" },
    b: { feedId: "f2", name: "Two" },
  },
  {
    trigger: newEnterpriseUser,
    path: "/v3/enterprise/users",
    wrap: (rows: unknown[]) => rows,
    a: { id: "u1", email: "a@example.com" },
    b: { id: "u2", email: "b@example.com" },
  },
];

for (const c of snapshots) {
  test(`${c.trigger.key}: seeds, emits only the added record, retries identically, sends the GET`, async () => {
    const seed = mockCtx([{ body: c.wrap([c.a]) }]);
    const seeded = await c.trigger.poll!({ params: {}, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const run = () => {
      const m = mockCtx([{ body: c.wrap([c.a, c.b]) }]);
      return { m, p: c.trigger.poll!({ params: {}, state: seeded.nextState }, m.ctx) };
    };
    const first = run();
    const out = await first.p;
    assertEquals(out.events, [c.b]);
    assertEquals(await run().p, out);
    const url = new URL(first.m.calls[0].url);
    assertEquals(
      { method: first.m.calls[0].method, path: url.pathname, query: url.search },
      { method: "GET", path: c.path, query: "" },
    );
  });
}

test("new-ai-feed never emits the caller's private AI Feeds", async () => {
  const seeded = await newAiFeed.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: { enterpriseAlerts: [], userAlerts: [] } }]).ctx,
  );
  const out = await newAiFeed.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([{ body: { enterpriseAlerts: [], userAlerts: [{ feedId: "private-1" }] } }]).ctx,
  );
  assertEquals(out.events, []);
});

// ---- new-search-article (since-filter, brief 9.8 / 9.9) ----

const QUERY = { layers: [{ type: "matches", parts: [{ text: "ransomware" }] }] };
const input = { params: { query: QUERY }, subscriptionId: "sub_1" };
const article = (id: string, crawled?: number) => ({
  id,
  title: `T ${id}`,
  ...(crawled === undefined ? {} : { crawled }),
});
const OLD = Date.parse("2026-11-10T00:00:00Z");
const NEW = Date.parse("2026-11-10T00:33:00Z");

async function withClock<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => Date.parse(iso);
  try {
    return await fn();
  } finally {
    Date.now = real;
  }
}

test("new-search-article: seeds, emits only unseen articles, retries identically, POSTs the literal search", async () => {
  await withClock("2026-11-10T00:35:00Z", async () => {
    const state = {
      v: 1 as const,
      kind: "ids" as const,
      seeded: true as const,
      ids: ["a"],
      cursor: Date.parse("2026-11-10T00:30:00Z"),
      floor: 0,
    };
    const page = { body: { items: [article("b"), article("a")] } };
    const first = mockCtx([page]);
    const out = await newSearchArticle.poll!({ ...input, state }, first.ctx);
    const again = await newSearchArticle.poll!({ ...input, state }, mockCtx([page]).ctx);
    assertEquals(out.events, [article("b")]);
    assertEquals(again, out);
    const url = new URL(first.calls[0].url);
    assertEquals(first.calls[0].method, "POST");
    assertEquals(url.pathname, "/v3/search/contents");
    assertEquals(Object.fromEntries(url.searchParams), {
      count: "100",
      newerThan: String(Date.parse("2026-11-10T00:28:00Z")),
    });
    assertEquals(JSON.parse(first.calls[0].body!), QUERY);
  });
});

test("new-search-article: seeding reads nothing, and records that predate the seed never fire, even over 6 full pages", async () => {
  const rec = (id: string, at: number) => article(id, at);
  const full = (n: number, last: boolean) => ({
    body: {
      items: Array.from({ length: 100 }, (_, i) => rec(`p${n}-${i}`, OLD)),
      ...(last ? {} : { continuation: `tok${n}` }),
    },
  });
  let state: unknown;
  await withClock("2026-11-10T00:30:00Z", async () => {
    const { ctx, calls } = mockCtx([{ body: { items: [rec("a", OLD)] } }]);
    const seeded = await newSearchArticle.poll!({ ...input, state: {} }, ctx);
    assertEquals(seeded.events, []);
    assertEquals(calls.length, 0);
    assertEquals(
      (seeded.nextState as { floor?: number }).floor,
      Date.parse("2026-11-10T00:30:00Z"),
    );
    state = seeded.nextState;
  });
  await withClock("2026-11-10T00:35:00Z", async () => {
    const { ctx, calls } = mockCtx([1, 2, 3, 4, 5].map((n) => full(n, false)));
    const result = await newSearchArticle.poll!({ ...input, state }, ctx);
    assertEquals(calls.length, 5);
    assertEquals(new URL(calls[4].url).searchParams.get("continuation"), "tok4");
    assertEquals(result.events, []);
    state = result.nextState;
  });
  await withClock("2026-11-10T00:40:00Z", async () => {
    const result = await newSearchArticle.poll!({ ...input, state }, mockCtx([full(6, true)]).ctx);
    assertEquals(result.events, []);
    state = result.nextState;
  });
  await withClock("2026-11-10T00:45:00Z", async () => {
    const result = await newSearchArticle.poll!(
      { ...input, state },
      mockCtx([{ body: { items: [rec("old1", OLD), rec("fresh", NEW)] } }]).ctx,
    );
    assertEquals(result.events, [rec("fresh", NEW)]);
  });
});

test("new-search-article: a window of six full pages is emitted exactly once across two checks and the cursor advances after the drain", async () => {
  const full = (n: number, last: boolean) => ({
    body: {
      items: Array.from({ length: 100 }, (_, i) => article(`p${n}-${i}`, NEW)),
      ...(last ? {} : { continuation: `tok${n}` }),
    },
  });
  const state = {
    v: 1 as const,
    kind: "ids" as const,
    seeded: true as const,
    ids: ["old"],
    cursor: Date.parse("2026-11-10T00:00:00Z"),
    floor: 0,
  };
  const seen: string[] = [];
  let mid: unknown;
  await withClock("2026-11-10T00:30:00Z", async () => {
    const { ctx, calls } = mockCtx([1, 2, 3, 4, 5].map((n) => full(n, false)));
    const result = await newSearchArticle.poll!({ ...input, state }, ctx);
    assertEquals(calls.length, 5);
    seen.push(...result.events.map((e) => String((e as { id: string }).id)));
    mid = result.nextState;
    assertEquals((mid as { resume?: { pos?: string } }).resume?.pos, "tok5");
    assertEquals((mid as { cursor?: number }).cursor, state.cursor);
  });
  await withClock("2026-11-10T00:35:00Z", async () => {
    const { ctx, calls } = mockCtx([full(6, true)]);
    const result = await newSearchArticle.poll!({ ...input, state: mid }, ctx);
    assertEquals(calls.length, 1);
    assertEquals(new URL(calls[0].url).searchParams.get("continuation"), "tok5");
    seen.push(...result.events.map((e) => String((e as { id: string }).id)));
    const next = result.nextState as { cursor?: number; resume?: unknown };
    assertEquals(next.cursor, Date.parse("2026-11-10T00:30:00Z"));
    assertEquals(next.resume, undefined);
  });
  assertEquals(seen.length, 600);
  assertEquals(new Set(seen).size, 600);
});
