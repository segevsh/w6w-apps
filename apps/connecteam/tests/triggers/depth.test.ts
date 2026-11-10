import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pagedEnvelope } from "../_helpers.ts";
import newUser from "../../triggers/new-user.ts";
import newForm from "../../triggers/new-form.ts";
import newJob from "../../triggers/new-job.ts";
import newTask from "../../triggers/new-task.ts";
import newSchedule from "../../triggers/new-schedule.ts";
import newTaskBoard from "../../triggers/new-task-board.ts";
import newTimeClock from "../../triggers/new-time-clock.ts";
import newFormSubmission from "../../triggers/new-form-submission.ts";
import { clock, MAX_ITEMS } from "../../lib/since.ts";

// deno-lint-ignore no-explicit-any
type Trigger = any;
const req = (call: { method: string; url: string }) => ({
  method: call.method,
  path: new URL(call.url).pathname,
  query: Object.fromEntries(new URL(call.url).searchParams),
});
const page = (data: unknown) => ({ body: pagedEnvelope(data) });
const seeded = (s: { nextState: unknown }) => (s.nextState as { seeded?: boolean }).seeded;

interface Case {
  name: string;
  trigger: Trigger;
  params: Record<string, unknown>;
  idKey: string;
  /** Wraps rows in the vendor's `data` object. */
  wrap: (rows: unknown[]) => unknown;
  /** The literal request the first (seeding) check sends. */
  request: { method: string; path: string; query: Record<string, string> };
}

const row = (idKey: string, id: number | string) => ({ [idKey]: id, name: `row ${id}` });

const cases: Case[] = [
  {
    name: "new-user",
    trigger: newUser,
    params: {},
    idKey: "userId",
    wrap: (users) => ({ users }),
    request: {
      method: "GET",
      path: "/users/v1/users",
      query: { sort: "created_at", order: "desc", limit: "100", offset: "0" },
    },
  },
  {
    name: "new-form",
    trigger: newForm,
    params: {},
    idKey: "formId",
    wrap: (forms) => ({ forms }),
    request: { method: "GET", path: "/forms/v1/forms", query: { limit: "300", offset: "0" } },
  },
  {
    name: "new-job",
    trigger: newJob,
    params: {},
    idKey: "jobId",
    wrap: (jobs) => ({ jobs }),
    request: {
      method: "GET",
      path: "/jobs/v1/jobs",
      query: { includeDeleted: "false", limit: "500", offset: "0" },
    },
  },
  {
    name: "new-task",
    trigger: newTask,
    params: { taskBoardId: "tb_9" },
    idKey: "id",
    wrap: (tasks) => ({ tasks }),
    request: {
      method: "GET",
      path: "/tasks/v1/taskboards/tb_9/tasks",
      query: { status: "published", limit: "100", offset: "0" },
    },
  },
  {
    name: "new-schedule",
    trigger: newSchedule,
    params: {},
    idKey: "schedulerId",
    wrap: (schedulers) => ({ schedulers }),
    request: { method: "GET", path: "/scheduler/v1/schedulers", query: {} },
  },
  {
    name: "new-task-board",
    trigger: newTaskBoard,
    params: {},
    idKey: "id",
    wrap: (taskBoards) => ({ taskBoards }),
    request: { method: "GET", path: "/tasks/v1/taskboards", query: {} },
  },
  {
    name: "new-time-clock",
    trigger: newTimeClock,
    params: {},
    idKey: "id",
    wrap: (timeClocks) => ({ timeClocks }),
    request: { method: "GET", path: "/time-clock/v1/time-clocks", query: {} },
  },
];

for (const c of cases) {
  const respond = (...ids: Array<number | string>) =>
    mockCtx([page(c.wrap(ids.map((id) => row(c.idKey, id))))]);
  const input = { params: c.params, subscriptionId: "sub-1" };

  test(`${c.name}: seeds without flooding and sends the documented request`, async () => {
    const seed = respond(1, 2);
    const result = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(result.events, []);
    assertEquals(seeded(result), true);
    assertEquals(seed.calls.length, 1);
    assertEquals(req(seed.calls[0]), c.request);
  });

  test(`${c.name}: emits only the new row and retries idempotently`, async () => {
    const seed = await c.trigger.poll!({ ...input, state: {} }, respond(1, 2).ctx);
    const first = await c.trigger.poll!({ ...input, state: seed.nextState }, respond(3, 2, 1).ctx);
    const retry = await c.trigger.poll!({ ...input, state: seed.nextState }, respond(3, 2, 1).ctx);
    assertEquals(first.events, [row(c.idKey, 3)]);
    assertEquals(retry, first);
  });
}

test("new-task: a missing task board is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  let message = "";
  await newTask.poll!({ params: {}, subscriptionId: "s", state: {} }, ctx).catch((e: Error) => {
    message = e.message;
  });
  assertEquals(message, "Set Task board ID to the board to watch.");
  assertEquals(calls.length, 0);
});

test("new-job: a full page makes the walk request the next offset", async () => {
  const full = Array.from({ length: 500 }, (_, i) => row("jobId", `j${i}`));
  const { ctx, calls } = mockCtx([page({ jobs: full }), page({ jobs: [row("jobId", "last")] })]);
  const seeded = await newJob.poll!({ params: {}, subscriptionId: "s", state: {} }, ctx);
  assertEquals(seeded.events, []);
  assertEquals(req(calls[1]).query, { includeDeleted: "false", limit: "500", offset: "500" });
});

// ---- new-form-submission: since-filter (briefs 9.8 and 9.9) ------------------------------------
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const sec = (ms: number) => Math.floor(ms / 1000);
const sub = (id: string, atMs: number) => ({
  formSubmissionId: id,
  submissionTimestamp: sec(atMs),
});
const subs = (rows: unknown[]) => page({ formSubmissions: rows });
const subInput = { params: { formId: 4001 }, subscriptionId: "sub-1" };
/** A window of `rows` submissions as the 100-per-page responses the pager walks. */
const pagesOf = (rows: unknown[]) => {
  const out = [];
  for (let i = 0; i < rows.length; i += 100) out.push(subs(rows.slice(i, i + 100)));
  if (rows.length % 100 === 0) out.push(subs([]));
  return out;
};

test("new-form-submission: seed reads nothing and emits nothing", async () => {
  clock.now = () => NOW;
  const { ctx, calls } = mockCtx();
  const result = await newFormSubmission.poll!({ ...subInput, state: {} }, ctx);
  assertEquals(result.events, []);
  assertEquals(calls.length, 0);
  assertEquals((result.nextState as { floor?: number }).floor, NOW);
  assertEquals((result.nextState as { cursor?: number }).cursor, NOW);
});

test("new-form-submission: requests the window from cursor minus overlap, emits only new ones", async () => {
  clock.now = () => NOW;
  const seed = await newFormSubmission.poll!({ ...subInput, state: {} }, mockCtx().ctx);
  clock.now = () => NOW + 300_000;
  const fresh = sub("s2", NOW + 60_000);
  const run = mockCtx([subs([fresh])]);
  const first = await newFormSubmission.poll!({ ...subInput, state: seed.nextState }, run.ctx);
  const retry = await newFormSubmission.poll!(
    { ...subInput, state: seed.nextState },
    mockCtx([subs([fresh])]).ctx,
  );
  assertEquals(first.events, [fresh]);
  assertEquals(retry, first);
  assertEquals(req(run.calls[0]), {
    method: "GET",
    path: "/forms/v1/forms/4001/form-submissions",
    // NOW - 120 s = 2026-11-10T11:58:00Z
    query: { submittingStartTimestamp: "1794311880", limit: "100", offset: "0" },
  });
  assertEquals((first.nextState as { cursor?: number }).cursor, NOW + 300_000);
});

test("9.9: records that existed before the seed never emit, however many pages the window holds", async () => {
  clock.now = () => NOW;
  const seed = await newFormSubmission.poll!({ ...subInput, state: {} }, mockCtx().ctx);
  clock.now = () => NOW + 300_000;
  const old = Array.from({ length: 450 }, (_, i) => sub(`old${i}`, NOW - 3_600_000 - i * 1000));
  const check = await newFormSubmission.poll!(
    { ...subInput, state: seed.nextState },
    mockCtx(pagesOf(old)).ctx,
  );
  assertEquals(check.events, []);
  const created = sub("after", NOW + 120_000);
  const next = await newFormSubmission.poll!(
    { ...subInput, state: check.nextState },
    mockCtx(pagesOf([created, ...old])).ctx,
  );
  assertEquals(next.events, [created]);
});

test("9.8: a window larger than one check emits everything across checks, none twice", async () => {
  clock.now = () => NOW;
  const seed = await newFormSubmission.poll!({ ...subInput, state: {} }, mockCtx().ctx);
  const total = MAX_ITEMS * 2 + 200; // 1200 submissions, 12 full pages of 100 per read
  const window = Array.from({ length: total }, (_, i) => sub(`n${i}`, NOW + 1_000 + i * 1000));
  const newestFirst = [...window].reverse();
  let state = seed.nextState;
  const emitted: string[] = [];
  const cursors: number[] = [];
  for (let check = 1; check <= 3; check++) {
    clock.now = () => NOW + 300_000 * check;
    const result = await newFormSubmission.poll!(
      { ...subInput, state },
      mockCtx(pagesOf(newestFirst)).ctx,
    );
    emitted.push(
      ...(result.events as Array<{ formSubmissionId: string }>).map((e) => e.formSubmissionId),
    );
    cursors.push((result.nextState as { cursor: number }).cursor);
    state = result.nextState;
  }
  assertEquals(emitted.length, total);
  assertEquals(new Set(emitted).size, total);
  assertEquals(emitted[0], "n0");
  assertEquals(emitted[total - 1], `n${total - 1}`);
  // the cursor is held while the window is not drained, and moves on the check that drains it
  assertEquals(cursors, [NOW, NOW, NOW + 900_000]);
});
