import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/incident-create.ts";

const conn = { display: { pageId: "pg1" } };
const ok = { status: 201, body: { id: "inc1", status: "investigating" } };

/** Components move in the SAME request — one per second makes a loop painful. */
Deno.test("incident-create: sets component statuses in the same request", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({
    name: "Elevated errors",
    status: "investigating",
    body: "We are looking into it.",
    componentIds: "c1,c2",
    componentStatuses: '{"c1":"major_outage","c2":"degraded_performance"}',
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/pg1/incidents");
  const sent = JSON.parse(calls[0].body!).incident;
  assertEquals(sent.component_ids, ["c1", "c2"]);
  assertEquals(sent.components, { c1: "major_outage", c2: "degraded_performance" });
});

/** Notifying every customer must never happen by omission. */
Deno.test("incident-create: notifications default to off, and are always explicit", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ name: "x", status: "investigating" }, ctx);
  const sent = JSON.parse(calls[0].body!).incident;
  assert("deliver_notifications" in sent, "the flag must be present, not left to Statuspage");
  assertEquals(sent.deliver_notifications, false);
});

Deno.test("incident-create: asking to notify does notify", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ name: "x", status: "investigating", deliverNotifications: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).incident.deliver_notifications, true);
});

Deno.test("incident-create: an unknown component status is refused with the options", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ name: "x", componentStatuses: '{"c1":"broken"}' }, ctx),
    Error,
    "unknown status",
  );
  assertEquals(calls.length, 0);
});

/** A maintenance window needs both ends. */
Deno.test("incident-create: half a maintenance window is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(
    async () =>
      await action.execute!({
        name: "x",
        status: "scheduled",
        scheduledFor: "2026-09-01T02:00:00Z",
      }, ctx),
    Error,
    "not a window",
  );
});

Deno.test("incident-create: a missing title is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "name");
});

Deno.test("incident-create: the notify hint says it cannot be recalled", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "deliverNotifications")!;
  assert(/cannot be recalled/.test(p.hint!), p.hint);
  assertEquals(action.idempotent, false);
});
