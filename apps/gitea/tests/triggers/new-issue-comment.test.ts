import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newIssueComment from "../../triggers/new-issue-comment.ts";
import { clock, MAX_ITEMS } from "../../lib/since.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };
const input = { params: { repo: "api", issueNumber: 7 }, subscriptionId: "sub-1" };
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString().replace(".000Z", "Z");
const comment = (id: number, createdMs: number, updatedMs = createdMs) => ({
  id,
  body: `Comment ${id}`,
  created_at: iso(createdMs),
  updated_at: iso(updatedMs),
});
/** The whole list in ONE response: the endpoint documents no pager. */
const once = (rows: unknown[]) => [{ status: 200, body: rows }];

test("new-issue-comment: seed reads nothing and emits nothing", async () => {
  clock.now = () => NOW;
  const { ctx, calls } = mockCtx([], conn);
  const result = await newIssueComment.poll!({ ...input, state: {} }, ctx);
  assertEquals(result.events, []);
  assertEquals(calls.length, 0);
  assertEquals((result.nextState as { floor?: number }).floor, NOW);
});

test("new-issue-comment: ONE request with since (no page or limit), emits only new ones", async () => {
  clock.now = () => NOW;
  const seed = await newIssueComment.poll!({ ...input, state: {} }, mockCtx([], conn).ctx);
  clock.now = () => NOW + 300_000;
  const fresh = comment(2, NOW + 60_000);
  const run = mockCtx(once([fresh]), conn);
  const first = await newIssueComment.poll!({ ...input, state: seed.nextState }, run.ctx);
  const retry = await newIssueComment.poll!(
    { ...input, state: seed.nextState },
    mockCtx(once([fresh]), conn).ctx,
  );
  assertEquals(first.events, [fresh]);
  assertEquals(retry, first);
  assertEquals(run.calls.length, 1);
  const url = new URL(run.calls[0].url);
  assertEquals(run.calls[0].method, "GET");
  assertEquals(url.pathname, "/api/v1/repos/acme/api/issues/7/comments");
  // NOW - 120 s = 2026-11-10T11:58:00Z
  assertEquals(Object.fromEntries(url.searchParams), { since: "2026-11-10T11:58:00Z" });
});

test("new-issue-comment: an edited old comment is not new; the same comment never emits twice", async () => {
  clock.now = () => NOW;
  const seed = await newIssueComment.poll!({ ...input, state: {} }, mockCtx([], conn).ctx);
  clock.now = () => NOW + 300_000;
  const edited = comment(5, NOW - 86_400_000, NOW + 60_000);
  const fresh = comment(6, NOW + 100_000);
  const first = await newIssueComment.poll!(
    { ...input, state: seed.nextState },
    mockCtx(once([edited, fresh]), conn).ctx,
  );
  assertEquals(first.events, [fresh]);
  clock.now = () => NOW + 600_000;
  const second = await newIssueComment.poll!(
    { ...input, state: first.nextState },
    mockCtx(once([edited, fresh]), conn).ctx,
  );
  assertEquals(second.events, []);
});

test("9.9 new-issue-comment: comments that existed before the seed never emit", async () => {
  clock.now = () => NOW;
  const seed = await newIssueComment.poll!({ ...input, state: {} }, mockCtx([], conn).ctx);
  clock.now = () => NOW + 300_000;
  const old = Array.from({ length: 120 }, (_, i) => comment(1000 + i, NOW - 3_600_000 - i * 1000));
  const check = await newIssueComment.poll!(
    { ...input, state: seed.nextState },
    mockCtx(once(old), conn).ctx,
  );
  assertEquals(check.events, []);
  const created = comment(1, NOW + 120_000);
  const next = await newIssueComment.poll!(
    { ...input, state: check.nextState },
    mockCtx(once([...old, created]), conn).ctx,
  );
  assertEquals(next.events, [created]);
});

test("9.8 new-issue-comment: a window larger than one check emits everything across checks, none twice", async () => {
  clock.now = () => NOW;
  const seed = await newIssueComment.poll!({ ...input, state: {} }, mockCtx([], conn).ctx);
  const total = MAX_ITEMS * 2 + 200;
  const window = Array.from({ length: total }, (_, i) => comment(i + 1, NOW + 1_000 + i * 1000));
  let state = seed.nextState;
  const emitted: number[] = [];
  const cursors: number[] = [];
  for (let check = 1; check <= 3; check++) {
    clock.now = () => NOW + 300_000 * check;
    const result = await newIssueComment.poll!(
      { ...input, state },
      mockCtx(once(window), conn).ctx,
    );
    emitted.push(...(result.events as { id: number }[]).map((e) => e.id));
    cursors.push((result.nextState as { cursor: number }).cursor);
    state = result.nextState;
  }
  assertEquals(emitted.length, total);
  assertEquals(new Set(emitted).size, total);
  assertEquals(emitted[0], 1);
  assertEquals(emitted[total - 1], total);
  assertEquals(cursors, [NOW, NOW, NOW + 900_000]);
});

test("new-issue-comment: a missing issue number fails before any request", async () => {
  clock.now = () => NOW;
  const seed = await newIssueComment.poll!({ ...input, state: {} }, mockCtx([], conn).ctx);
  clock.now = () => NOW + 300_000;
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () =>
      await newIssueComment.poll!(
        { params: { repo: "api" }, subscriptionId: "sub-1", state: seed.nextState },
        ctx,
      ),
    Error,
    "Issue or PR Number",
  );
  assertEquals(calls.length, 0);
});
