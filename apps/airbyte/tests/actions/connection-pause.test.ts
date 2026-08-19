import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/connection-pause.ts";

const D = { display: { host: "https://api.airbyte.com" } };
const UUID = "e735894a-e773-4938-969f-45f53957b75b";
const connection = (status: string) => ({
  status: 200,
  body: { name: "Postgres to Snowflake", status, schedule: { scheduleType: "cron" } },
});

Deno.test("connection-pause: patches the status and reports the change", async () => {
  const { ctx, calls } = mockCtx([connection("active"), {
    status: 200,
    body: { status: "inactive" },
  }], D);
  const result = await action.execute({ connectionId: UUID, active: false }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[1].method, "PATCH");
  assertEquals(JSON.parse(calls[1].body!), { status: "inactive" });
  assertEquals(result.previousStatus, "active");
  assertEquals(result.changed, true);
});

/** The destination goes stale with nothing marking it. */
Deno.test("connection-pause: warns when it pauses", async () => {
  const { ctx, logs } = mockCtx([connection("active"), { status: 200, body: {} }], D);
  await action.execute({ connectionId: UUID, active: false }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /marks the tables as stale/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** Airbyte pauses connections itself after repeated failures. */
Deno.test("connection-pause: resuming notes that Airbyte may have paused it", async () => {
  const { ctx, logs } = mockCtx([connection("inactive"), { status: 200, body: {} }], D);
  await action.execute({ connectionId: UUID }, ctx);
  assert(
    logs.some((l) => /same failures are likely to follow/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("connection-pause: a no-op writes nothing", async () => {
  const { ctx, calls } = mockCtx([connection("active")], D);
  const result = await action.execute({ connectionId: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.changed, false);
  assertEquals(calls.length, 1);
});

/** A deprecated connection has been deleted and cannot come back. */
Deno.test("connection-pause: refuses a deprecated connection", async () => {
  const { ctx, calls } = mockCtx([connection("deprecated")], D);
  const err = await assertRejects(
    async () => await action.execute({ connectionId: UUID }, ctx),
    Error,
  );
  assert(/kept only for/.test(err.message), err.message);
  assertEquals(calls.length, 1);
});
