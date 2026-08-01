import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/incident-update.ts";

Deno.test("incident-update: sends only the fields provided, with the From header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { incident: { id: "P1" } } }]);
  const result = await action.execute!({
    incidentId: "P1",
    from: "user@example.com",
    updateFields: { title: "New title", urgency: "low" },
  }, ctx);

  assertEquals(calls[0].url, "https://api.pagerduty.com/incidents/P1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].headers["from"], "user@example.com");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.incident, { type: "incident", title: "New title", urgency: "low" });
  assertEquals(result, { id: "P1" });
});

Deno.test("incident-update: priority/escalationPolicy/escalationLevel map to references", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { incident: {} } }]);
  await action.execute!({
    incidentId: "P1",
    from: "user@example.com",
    updateFields: { priorityId: "PRI1", escalationPolicyId: "EP1", escalationLevel: 2 },
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.incident.priority, { id: "PRI1", type: "priority_reference" });
  assertEquals(body.incident.escalation_policy, { id: "EP1", type: "escalation_policy_reference" });
  assertEquals(body.incident.escalation_level, 2);
});

Deno.test("incident-update: missing incidentId or from rejects", async () => {
  for (const patch of [{ incidentId: "" }, { from: "" }]) {
    const { ctx } = mockCtx();
    await assertRejects(
      async () =>
        await action.execute!(
          { incidentId: "P1", from: "user@example.com", updateFields: {}, ...patch },
          ctx,
        ),
      Error,
    );
  }
});
