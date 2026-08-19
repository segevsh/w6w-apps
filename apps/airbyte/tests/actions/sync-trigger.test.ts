import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sync-trigger.ts";

const D = { display: { host: "https://api.airbyte.com" } };
const UUID = "e735894a-e773-4938-969f-45f53957b75b";
const active = { status: 200, body: { status: "active" } };
const started = { status: 200, body: { jobId: 4242, status: "pending" } };

Deno.test("sync-trigger: posts a sync job and returns the id to watch", async () => {
  const { ctx, calls } = mockCtx([active, started], D);
  const result = await action.execute({ connectionId: UUID }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[1].url).pathname, "/v1/jobs");
  assertEquals(JSON.parse(calls[1].body!), { connectionId: UUID, jobType: "sync" });
  assertEquals(result.jobId, 4242);
  assertEquals(result.status, "pending", "never a result");
  assertEquals(result.started, true);
});

/** Airbyte refuses rather than queues, and an event-driven trigger expects it. */
Deno.test("sync-trigger: a running sync is reported as a state, not thrown", async () => {
  const { ctx } = mockCtx(
    [active, { status: 409, body: { message: "A sync is already running" } }],
    D,
  );
  const result = await action.execute({ connectionId: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.alreadyRunning, true);
  assertEquals(result.started, false);
  assertEquals(result.jobId, undefined);
});

Deno.test("sync-trigger: failIfRunning turns the conflict back into an error", async () => {
  const { ctx } = mockCtx([active, { status: 409, body: { message: "already running" } }], D);
  await assertRejects(
    async () => await action.execute({ connectionId: UUID, failIfRunning: true }, ctx),
    Error,
    "409",
  );
});

/** Any other failure is a real failure. */
Deno.test("sync-trigger: a 500 still throws", async () => {
  const { ctx } = mockCtx([active, { status: 500, body: { message: "boom" } }], D);
  await assertRejects(async () => await action.execute({ connectionId: UUID }, ctx), Error, "500");
});

/** A paused connection still accepts a manual sync. */
Deno.test("sync-trigger: triggering an inactive connection is flagged", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { status: "inactive" } }, started], D);
  const result = await action.execute({ connectionId: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.connectionWasInactive, true);
  assert(
    logs.some((l) => l.level === "warn" && /working around a pause/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** The status lookup is context, not a gate. */
Deno.test("sync-trigger: a failed status lookup does not stop the sync", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }, started], D);
  const result = await action.execute({ connectionId: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.started, true);
  assertEquals(result.connectionWasInactive, false);
});

Deno.test("sync-trigger: is not idempotent, and says the data has not moved yet", () => {
  assertEquals(action.idempotent, false);
  assert(/RETURNS IMMEDIATELY/.test(action.description!), action.description);
});
