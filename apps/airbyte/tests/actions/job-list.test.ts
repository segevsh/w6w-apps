import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-list.ts";

const D = { display: { host: "https://api.airbyte.com" } };
const UUID = "e735894a-e773-4938-969f-45f53957b75b";
const jobs = {
  status: 200,
  body: {
    data: [
      {
        jobId: 3,
        status: "incomplete",
        jobType: "sync",
        rowsSynced: 12,
        startTime: "2026-08-19T10:00:00Z",
        lastUpdatedAt: "2026-08-19T10:02:00Z",
      },
      {
        jobId: 2,
        status: "succeeded",
        jobType: "sync",
        rowsSynced: 1000,
        startTime: "2026-08-19T09:00:00Z",
        lastUpdatedAt: "2026-08-19T09:04:00Z",
      },
      { jobId: 1, status: "failed", jobType: "sync", startTime: "2026-08-19T08:00:00Z" },
    ],
  },
};

/** The status a workflow branching on `failed` treats as a success. */
Deno.test("job-list: counts incomplete apart from succeeded and failed", async () => {
  const { ctx, logs } = mockCtx([jobs], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.succeeded, 1);
  assertEquals(result.failed, 1);
  assertEquals(result.incomplete, 1);
  assert(
    logs.some((l) => l.level === "warn" && /neither a success nor a failure/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** When the data last fully arrived — the number people mean by "healthy". */
Deno.test("job-list: reports the last full success, not the last job", async () => {
  const { ctx } = mockCtx([jobs], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals((result.latest as { jobId: number }).jobId, 3);
  assertEquals(result.lastSuccessAt, "2026-08-19T09:04:00Z");
});

/** Airbyte reports timestamps, not durations. */
Deno.test("job-list: computes each duration and averages the finished ones", async () => {
  const { ctx } = mockCtx([jobs], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  const list = result.jobs as Array<{ durationSeconds?: number }>;
  assertEquals(list[0].durationSeconds, 120);
  assertEquals(list[1].durationSeconds, 240);
  assertEquals(list[2].durationSeconds, undefined);
  assertEquals(result.averageDurationSeconds, 180);
});

/** Airbyte would keep the connection id and drop the workspaces silently. */
Deno.test("job-list: refuses both filters rather than letting one be ignored", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ connectionId: UUID, workspaceIds: "w1" }, ctx),
    Error,
  );
  assert(/silently ignores the workspaces/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("job-list: the filters that are allowed reach the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], D);
  await action.execute({ connectionId: UUID, jobType: "sync", status: "failed", limit: 5 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("connectionId"), UUID);
  assertEquals(q.get("jobType"), "sync");
  assertEquals(q.get("status"), "failed");
  assertEquals(q.get("limit"), "5");
});

Deno.test("job-list: totals the rows moved", async () => {
  const { ctx } = mockCtx([jobs], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.totalRowsSynced, 1012);
});
