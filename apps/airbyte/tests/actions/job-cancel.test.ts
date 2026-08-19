import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-cancel.ts";

const D = { display: { host: "https://api.airbyte.com" } };
const running = { status: 200, body: { status: "running", connectionId: "c1", rowsSynced: 120 } };
const done = { status: 200, body: { status: "succeeded", connectionId: "c1", rowsSynced: 900 } };
const cancelled = { status: 200, body: { status: "cancelled", rowsSynced: 120 } };

/** The verb is DELETE and the record survives. */
Deno.test("job-cancel: cancels a running job with a DELETE", async () => {
  const { ctx, calls } = mockCtx([running, cancelled], D);
  const result = await action.execute({ jobId: 42 }, ctx) as Record<string, unknown>;
  assertEquals(calls[1].method, "DELETE");
  assertEquals(new URL(calls[1].url).pathname, "/v1/jobs/42");
  assertEquals(result.status, "cancelled");
  assertEquals(result.wasRunning, true);
  assertEquals(result.cancelled, true);
});

/** Airbyte writes as it goes, so cancelling leaves a partial write. */
Deno.test("job-cancel: warns that the destination is partly written", async () => {
  const { ctx, logs } = mockCtx([running, cancelled], D);
  const result = await action.execute({ jobId: 42 }, ctx) as Record<string, unknown>;
  assertEquals(result.rowsSynced, 120);
  assert(
    logs.some((l) => l.level === "warn" && /rather than a rollback/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** Cancelling a job that already finished should change nothing. */
Deno.test("job-cancel: a finished job is not cancelled and not deleted", async () => {
  const { ctx, calls, logs } = mockCtx([done], D);
  const result = await action.execute({ jobId: 42 }, ctx) as Record<string, unknown>;
  assertEquals(result.wasRunning, false);
  assertEquals(result.cancelled, false);
  assertEquals(result.status, "succeeded");
  assertEquals(calls.length, 1, "it must not send the DELETE");
  assertEquals(logs.length, 0);
});

Deno.test("job-cancel: requires a numeric id", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "numeric id");
});

Deno.test("job-cancel: says the record survives the DELETE", () => {
  assert(/the job record survives as `cancelled`/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
