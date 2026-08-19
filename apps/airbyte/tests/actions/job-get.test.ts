import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-get.ts";

const D = { display: { host: "https://api.airbyte.com" } };
const job = (status: string, extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    jobId: 42,
    status,
    jobType: "sync",
    connectionId: "c1",
    startTime: "2026-08-19T10:00:00Z",
    lastUpdatedAt: "2026-08-19T10:05:00Z",
    rowsSynced: 500,
    ...extra,
  },
});

/** Finished and succeeded are two different questions. */
Deno.test("job-get: a succeeded job is both finished and succeeded", async () => {
  const { ctx, calls } = mockCtx([job("succeeded")], D);
  const result = await action.execute({ jobId: 42 }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v1/jobs/42");
  assertEquals(result.finished, true);
  assertEquals(result.succeeded, true);
  assertEquals(result.incomplete, false);
  assertEquals(result.durationSeconds, 300);
});

/** The trap: over, and not fine. */
Deno.test("job-get: an incomplete job is finished and NOT succeeded", async () => {
  const { ctx, logs } = mockCtx([job("incomplete")], D);
  const result = await action.execute({ jobId: 42 }, ctx) as Record<string, unknown>;
  assertEquals(result.finished, true);
  assertEquals(result.succeeded, false);
  assertEquals(result.incomplete, true);
  assert(
    logs.some((l) => l.level === "warn" && /nothing marks which part/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("job-get: a running job is neither finished nor succeeded", async () => {
  for (const status of ["pending", "running"]) {
    const { ctx, logs } = mockCtx([job(status)], D);
    const result = await action.execute({ jobId: 42 }, ctx) as Record<string, unknown>;
    assertEquals(result.finished, false, status);
    assertEquals(result.succeeded, false, status);
    assertEquals(logs.length, 0, status);
  }
});

Deno.test("job-get: a failure logs the reason Airbyte gave", async () => {
  const { ctx, logs } = mockCtx([
    job("failed", { failureReason: { failureType: "system_error" } }),
  ], D);
  await action.execute({ jobId: 42 }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /ended failed/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("job-get: requires a numeric id", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "numeric id");
  await assertRejects(async () => await action.execute({ jobId: 0 }, ctx), Error, "numeric id");
  assertEquals(calls.length, 0);
});
