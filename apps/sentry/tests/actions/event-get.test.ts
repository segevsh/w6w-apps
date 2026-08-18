import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-get.ts";

const display = { organizationSlug: "acme" };

Deno.test("event-get: fetches one event by its hexadecimal id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { eventID: "a".repeat(32) } }], { display });
  await action.execute!({ projectSlug: "backend", eventId: "a".repeat(32) }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    `/api/0/projects/acme/backend/events/${"a".repeat(32)}/`,
  );
});

Deno.test("event-get: environments are repeated query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!(
    { projectSlug: "backend", eventId: "abc", environment: "prod, staging" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).searchParams.getAll("environment"), ["prod", "staging"]);
});

Deno.test("event-get: both ids are required before any request", async () => {
  const noProject = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ eventId: "abc" }, noProject.ctx),
    Error,
    "projectSlug",
  );
  const noEvent = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ projectSlug: "backend" }, noEvent.ctx),
    Error,
    "eventId",
  );
  assertEquals(noProject.calls.length + noEvent.calls.length, 0);
});
