import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/change-search.ts";

const D = { display: { host: "https://gerrit.example.com" } };
const PREFIX = ")]}'\n";
const body = (changes: unknown[]) => ({ status: 200, body: PREFIX + JSON.stringify(changes) });

const CHANGES = [
  {
    _number: 1,
    subject: "Fix the thing",
    submittable: true,
    unresolved_comment_count: 0,
    updated: "2026-08-18 10:00:00.000000000",
    labels: { "Code-Review": { approved: { name: "Ada" } } },
  },
  {
    _number: 2,
    subject: "Blocked work",
    submittable: false,
    updated: "2026-08-01 10:00:00.000000000",
    labels: { "Code-Review": { rejected: { name: "Grace" } } },
  },
  {
    _number: 3,
    subject: "Draft",
    work_in_progress: true,
    unresolved_comment_count: 2,
    updated: "2026-08-17 10:00:00.000000000",
    labels: {},
    _more_changes: true,
  },
];

/** Options are opt-in; without them labels are absent. */
Deno.test("change-search: requests the options its outputs depend on", async () => {
  const { ctx, calls } = mockCtx([body(CHANGES)], D);
  await action.execute({ q: "status:open" }, ctx);
  const options = new URL(calls[0].url).searchParams.getAll("o");
  assert(options.includes("LABELS"), options.join(","));
  assert(options.includes("SUBMITTABLE"), options.join(","));
  assert(!options.includes("MERGEABLE"), "mergeability is expensive and opt-in");
});

Deno.test("change-search: mergeability and extra options are added on request", async () => {
  const { ctx, calls } = mockCtx([body([])], D);
  await action.execute({
    q: "status:open",
    includeMergeable: true,
    extraOptions: "current_revision, messages",
  }, ctx);
  const options = new URL(calls[0].url).searchParams.getAll("o");
  assert(options.includes("MERGEABLE"), options.join(","));
  assert(options.includes("CURRENT_REVISION"), options.join(","));
  assert(options.includes("MESSAGES"), options.join(","));
});

/** A -2 blocks outright; the app must not treat votes as a sum. */
Deno.test("change-search: separates submittable, blocked and work-in-progress", async () => {
  const { ctx } = mockCtx([body(CHANGES)], D);
  const result = await action.execute({ q: "status:open" }, ctx) as Record<string, unknown>;
  assertEquals(result.submittable, ["1: Fix the thing"]);
  assertEquals(result.blocked, ["2: Blocked work"]);
  assertEquals(result.workInProgress, ["3: Draft"]);
  assertEquals(result.withUnresolvedComments, ["3: Draft"]);
});

/** Gerrit marks truncation on the last change, not at the top level. */
Deno.test("change-search: notices `_more_changes` and says it is easy to miss", async () => {
  const { ctx, logs } = mockCtx([body(CHANGES)], D);
  const result = await action.execute({ q: "status:open" }, ctx) as Record<string, unknown>;
  assertEquals(result.hasMore, true);
  assert(
    logs.some((l) => /more matches than came back/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** Timestamps must be read as UTC rather than local. */
Deno.test("change-search: ages come from the UTC-parsed timestamps", async () => {
  const { ctx } = mockCtx([body(CHANGES)], D);
  const result = await action.execute({ q: "status:open" }, ctx) as Record<string, unknown>;
  assert(Number(result.oldestDays) > 0, String(result.oldestDays));
});

Deno.test("change-search: the query, limit and skip reach the URL", async () => {
  const { ctx, calls } = mockCtx([body([])], D);
  await action.execute({ q: "is:submittable project:platform", limit: 5, start: 10 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("q"), "is:submittable project:platform");
  assertEquals(q.get("n"), "5");
  assertEquals(q.get("S"), "10");
});

Deno.test("change-search: requires a query", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(async () => await action.execute({ q: "" }, ctx), Error);
  assert(/`status:open` is the usual starting point/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});
