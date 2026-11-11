import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newBranch from "../../triggers/new-branch.ts";
import newTag from "../../triggers/new-tag.ts";
import newRelease from "../../triggers/new-release.ts";
import newRepo from "../../triggers/new-repo.ts";
import newIssue from "../../triggers/new-issue.ts";
import newOrUpdatedIssue from "../../triggers/new-or-updated-issue.ts";
import newCommit from "../../triggers/new-commit.ts";
import { clock, MAX_ITEMS } from "../../lib/since.ts";

// deno-lint-ignore no-explicit-any
type Trigger = any;
const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };
const params = { repo: "api" };
const req = (call: { method: string; url: string }) => ({
  method: call.method,
  path: new URL(call.url).pathname,
  query: Object.fromEntries(new URL(call.url).searchParams),
});
const seeded = (s: { nextState: unknown }) => (s.nextState as { seeded?: boolean }).seeded;

interface Case {
  name: string;
  trigger: Trigger;
  params: Record<string, unknown>;
  idKey: string;
  /** Wraps rows in the vendor's response body. */
  wrap: (rows: unknown[]) => unknown;
  /** The literal request the first (seeding) check sends. */
  request: { method: string; path: string; query: Record<string, string> };
}

const row = (idKey: string, id: number | string) => ({ [idKey]: id, name: `row ${id}` });

const cases: Case[] = [
  {
    name: "new-branch",
    trigger: newBranch,
    params,
    idKey: "name",
    wrap: (rows) => rows,
    request: {
      method: "GET",
      path: "/api/v1/repos/acme/api/branches",
      query: { page: "1", limit: "50" },
    },
  },
  {
    name: "new-tag",
    trigger: newTag,
    params,
    idKey: "name",
    wrap: (rows) => rows,
    request: {
      method: "GET",
      path: "/api/v1/repos/acme/api/tags",
      query: { page: "1", limit: "50" },
    },
  },
  {
    name: "new-release",
    trigger: newRelease,
    params,
    idKey: "id",
    wrap: (rows) => rows,
    request: {
      method: "GET",
      path: "/api/v1/repos/acme/api/releases",
      query: { page: "1", limit: "50" },
    },
  },
  {
    name: "new-repo",
    trigger: newRepo,
    params: {},
    idKey: "id",
    wrap: (data) => ({ ok: true, data }),
    request: {
      method: "GET",
      path: "/api/v1/repos/search",
      query: { sort: "created", order: "desc", page: "1", limit: "50" },
    },
  },
];

for (const c of cases) {
  const respond = (...ids: Array<number | string>) =>
    mockCtx([{ status: 200, body: c.wrap(ids.map((id) => row(c.idKey, id))) }], conn);
  const input = { params: c.params, subscriptionId: "sub-1" };
  // snapshot rows are named strings; newest-first rows are numbers
  const [a, b, n] = c.idKey === "name" ? ["a", "b", "c"] : [1, 2, 3];

  test(`${c.name}: seeds without flooding and sends the documented request`, async () => {
    const seed = respond(a, b);
    const result = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(result.events, []);
    assertEquals(seeded(result), true);
    assertEquals(seed.calls.length, 1);
    assertEquals(req(seed.calls[0]), c.request);
  });

  test(`${c.name}: emits only the new row and retries idempotently`, async () => {
    const seed = await c.trigger.poll!({ ...input, state: {} }, respond(a, b).ctx);
    const first = await c.trigger.poll!({ ...input, state: seed.nextState }, respond(n, b, a).ctx);
    const retry = await c.trigger.poll!({ ...input, state: seed.nextState }, respond(n, b, a).ctx);
    assertEquals(first.events, [row(c.idKey, n)]);
    assertEquals(retry, first);
  });
}

test("new-branch: a full page makes the walk request the next page", async () => {
  const full = Array.from({ length: 50 }, (_, i) => ({ name: `b${i}` }));
  const run = mockCtx([
    { status: 200, body: full },
    { status: 200, body: [{ name: "last" }] },
  ], conn);
  await newBranch.poll!({ params, subscriptionId: "sub-1", state: {} }, run.ctx);
  assertEquals(run.calls.map((call) => req(call).query), [
    { page: "1", limit: "50" },
    { page: "2", limit: "50" },
  ]);
});

// ---- since-filter triggers (brief 9.1 b, 9.8, 9.9) ----

const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString().replace(".000Z", "Z");
const issue = (id: number, createdMs: number, updatedMs = createdMs) => ({
  id,
  number: id,
  title: `Issue ${id}`,
  created_at: iso(createdMs),
  updated_at: iso(updatedMs),
});
const commit = (sha: string, atMs: number) => ({ sha, created: iso(atMs) });
const input = { params, subscriptionId: "sub-1" };

interface SinceCase {
  name: string;
  trigger: Trigger;
  path: string;
  /** Extra query the action sends besides since/page/limit. */
  extra: Record<string, string>;
  make: (id: number, atMs: number) => unknown;
  idOf: (event: unknown) => string;
}

const sinceCases: SinceCase[] = [
  {
    name: "new-issue",
    trigger: newIssue,
    path: "/api/v1/repos/acme/api/issues",
    extra: { type: "issues", state: "all" },
    make: (id, at) => issue(id, at),
    idOf: (e) => String((e as { id: number }).id),
  },
  {
    name: "new-or-updated-issue",
    trigger: newOrUpdatedIssue,
    path: "/api/v1/repos/acme/api/issues",
    extra: { type: "issues", state: "all" },
    make: (id, at) => issue(id, at),
    idOf: (e) => String((e as { id: number }).id),
  },
  {
    name: "new-commit",
    trigger: newCommit,
    path: "/api/v1/repos/acme/api/commits",
    extra: {},
    make: (id, at) => commit(`sha${id}`, at),
    idOf: (e) => (e as { sha: string }).sha,
  },
];

/** A window of `rows` as the 50-per-page responses the action's pager walks. */
const pagesOf = (rows: unknown[]) => {
  const out = [];
  for (let i = 0; i < rows.length; i += 50) out.push({ status: 200, body: rows.slice(i, i + 50) });
  if (rows.length % 50 === 0) out.push({ status: 200, body: [] });
  return out;
};

for (const c of sinceCases) {
  test(`${c.name}: seed reads nothing and emits nothing`, async () => {
    clock.now = () => NOW;
    const { ctx, calls } = mockCtx([], conn);
    const result = await c.trigger.poll!({ ...input, state: {} }, ctx);
    assertEquals(result.events, []);
    assertEquals(calls.length, 0);
    assertEquals((result.nextState as { floor?: number }).floor, NOW);
  });

  test(`${c.name}: requests the window from cursor minus overlap and emits only new ones`, async () => {
    clock.now = () => NOW;
    const seed = await c.trigger.poll!({ ...input, state: {} }, mockCtx([], conn).ctx);
    clock.now = () => NOW + 300_000;
    const fresh = c.make(2, NOW + 60_000);
    const run = mockCtx(pagesOf([fresh]), conn);
    const first = await c.trigger.poll!({ ...input, state: seed.nextState }, run.ctx);
    const retry = await c.trigger.poll!(
      { ...input, state: seed.nextState },
      mockCtx(pagesOf([fresh]), conn).ctx,
    );
    assertEquals(first.events, [fresh]);
    assertEquals(retry, first);
    assertEquals(req(run.calls[0]), {
      method: "GET",
      path: c.path,
      // NOW - 120 s = 2026-11-10T11:58:00Z
      query: { ...c.extra, since: "2026-11-10T11:58:00Z", page: "1", limit: "50" },
    });
  });

  test(`9.9 ${c.name}: records that existed before the seed never emit, however many pages`, async () => {
    clock.now = () => NOW;
    const seed = await c.trigger.poll!({ ...input, state: {} }, mockCtx([], conn).ctx);
    clock.now = () => NOW + 300_000;
    const old = Array.from({ length: 120 }, (_, i) => c.make(1000 + i, NOW - 3_600_000 - i * 1000));
    const check = await c.trigger.poll!(
      { ...input, state: seed.nextState },
      mockCtx(pagesOf(old), conn).ctx,
    );
    assertEquals(check.events, []);
    const created = c.make(1, NOW + 120_000);
    const next = await c.trigger.poll!(
      { ...input, state: check.nextState },
      mockCtx(pagesOf([created, ...old]), conn).ctx,
    );
    assertEquals(next.events, [created]);
  });

  test(`9.8 ${c.name}: a window larger than one check emits everything across checks, none twice`, async () => {
    clock.now = () => NOW;
    const seed = await c.trigger.poll!({ ...input, state: {} }, mockCtx([], conn).ctx);
    const total = MAX_ITEMS * 2 + 200; // 1200 records, 24 full pages of 50 per read
    const window = Array.from({ length: total }, (_, i) => c.make(i + 1, NOW + 1_000 + i * 1000));
    const newestFirst = [...window].reverse();
    let state = seed.nextState;
    const emitted: string[] = [];
    const cursors: number[] = [];
    for (let check = 1; check <= 3; check++) {
      clock.now = () => NOW + 300_000 * check;
      const result = await c.trigger.poll!(
        { ...input, state },
        mockCtx(pagesOf(newestFirst), conn).ctx,
      );
      emitted.push(...(result.events as unknown[]).map(c.idOf));
      cursors.push((result.nextState as { cursor: number }).cursor);
      state = result.nextState;
    }
    assertEquals(emitted.length, total);
    assertEquals(new Set(emitted).size, total);
    assertEquals(emitted[0], c.idOf(window[0]));
    assertEquals(emitted[total - 1], c.idOf(window[total - 1]));
    // the cursor is held while the window is not drained, and moves on the check that drains it
    assertEquals(cursors, [NOW, NOW, NOW + 900_000]);
  });
}

test("new-issue: an issue opened before the seed but edited after it is not new", async () => {
  clock.now = () => NOW;
  const seed = await newIssue.poll!({ ...input, state: {} }, mockCtx([], conn).ctx);
  clock.now = () => NOW + 300_000;
  const edited = issue(7, NOW - 86_400_000, NOW + 60_000);
  const check = await newIssue.poll!(
    { ...input, state: seed.nextState },
    mockCtx(pagesOf([edited]), conn).ctx,
  );
  assertEquals(check.events, []);
});

test("new-or-updated-issue: an edited record is a new event, an untouched one is not", async () => {
  clock.now = () => NOW;
  const seed = await newOrUpdatedIssue.poll!({ ...input, state: {} }, mockCtx([], conn).ctx);
  clock.now = () => NOW + 300_000;
  const created = issue(7, NOW + 10_000);
  const first = await newOrUpdatedIssue.poll!(
    { ...input, state: seed.nextState },
    mockCtx(pagesOf([created]), conn).ctx,
  );
  assertEquals(first.events, [created]);
  clock.now = () => NOW + 600_000;
  const edited = issue(7, NOW + 10_000, NOW + 400_000);
  const second = await newOrUpdatedIssue.poll!(
    { ...input, state: first.nextState },
    mockCtx(pagesOf([edited]), conn).ctx,
  );
  assertEquals(second.events, [edited]);
  clock.now = () => NOW + 900_000;
  const same = await newOrUpdatedIssue.poll!(
    { ...input, state: second.nextState },
    mockCtx(pagesOf([edited]), conn).ctx,
  );
  assertEquals(same.events, []);
});
