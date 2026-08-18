import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audit-log-event-create.ts";

const event = {
  organizationId: "org_1",
  action: "user.signed_in",
  actorId: "user_1",
  actorType: "user",
  targetId: "team_1",
  targetType: "team",
  occurredAt: "2026-08-18T12:00:00Z",
};

Deno.test("audit-log-event-create: builds the actor, target and occurrence WorkOS expects", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { success: true } }]);
  await action.execute!({ ...event, metadata: '{"ip":"203.0.113.1"}' }, ctx);
  assertEquals(calls[0].url, "https://api.workos.com/audit_logs/events");
  assertEquals(JSON.parse(calls[0].body!), {
    organization_id: "org_1",
    event: {
      action: "user.signed_in",
      occurred_at: "2026-08-18T12:00:00Z",
      version: 1,
      actor: { id: "user_1", type: "user" },
      targets: [{ id: "team_1", type: "team" }],
      context: { location: "0.0.0.0" },
      metadata: { ip: "203.0.113.1" },
    },
  });
});

/**
 * WorkOS records when the thing happened, not when it was told — so a retry or
 * a batch replay preserves the real order.
 */
Deno.test("audit-log-event-create: stamps now only when no time is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { success: true } }]);
  await action.execute!({ ...event, occurredAt: "" }, ctx);
  const stamped = JSON.parse(calls[0].body!).event.occurred_at as string;
  assert(!Number.isNaN(Date.parse(stamped)), stamped);
});

/**
 * An audit log is append-only and its metadata reaches the customer's security
 * team. It is not repeated into this side's run log.
 */
Deno.test("audit-log-event-create: logs the action and organization, never the metadata", async () => {
  const { ctx, logs } = mockCtx([{ status: 201, body: { success: true } }]);
  await action.execute!({ ...event, metadata: '{"secret":"tuna"}' }, ctx);
  assert(!JSON.stringify(logs).includes("tuna"), JSON.stringify(logs));
  assertEquals(logs[0].data, { organizationId: "org_1", action: "user.signed_in" });
});

Deno.test("audit-log-event-create: every required field is checked before the request", async () => {
  for (const missing of ["organizationId", "action", "actorId", "targetId", "targetType"]) {
    const { ctx, calls } = mockCtx();
    const input = { ...event, [missing]: "" };
    await assertRejects(async () => await action.execute!(input, ctx), Error, missing);
    assertEquals(calls.length, 0, `${missing} reached the wire`);
  }
});

Deno.test("audit-log-event-create: malformed metadata is refused by name", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ ...event, metadata: "{oops" }, ctx),
    Error,
    "metadata",
  );
});

/** An unregistered action, or an undeclared metadata key, is rejected. */
Deno.test("audit-log-event-create: says the schema must be registered first", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "action")!;
  assert(/registered/.test(p.hint!), p.hint);
});
