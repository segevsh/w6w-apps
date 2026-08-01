import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/incident-create.ts";

function baseInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: "Database is down",
    serviceId: "SV1",
    from: "user@example.com",
    ...overrides,
  };
}

Deno.test("incident-create: posts a minimal incident and sends the From header", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { incident: { id: "P1" } } }]);
  const result = await action.execute!(baseInput(), ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.pagerduty.com/incidents");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["from"], "user@example.com");
  assertEquals(calls[0].headers["content-type"], "application/json");

  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.incident.type, "incident");
  assertEquals(body.incident.title, "Database is down");
  assertEquals(body.incident.service, { id: "SV1", type: "service_reference" });
  assertEquals(result, { id: "P1" });
});

Deno.test("incident-create: additionalFields map onto the request body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { incident: {} } }]);
  await action.execute!(
    baseInput({
      additionalFields: {
        details: "root cause unknown",
        urgency: "high",
        priorityId: "PRI1",
        escalationPolicyId: "EP1",
        incidentKey: "dedupe-key",
      },
    }),
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.incident.body, { type: "incident_body", details: "root cause unknown" });
  assertEquals(body.incident.urgency, "high");
  assertEquals(body.incident.priority, { id: "PRI1", type: "priority_reference" });
  assertEquals(body.incident.escalation_policy, { id: "EP1", type: "escalation_policy_reference" });
  assertEquals(body.incident.incident_key, "dedupe-key");
});

Deno.test("incident-create: missing required fields reject with informative errors", async () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["title", { title: "" }],
    ["serviceId", { serviceId: "" }],
    ["from", { from: "" }],
  ];
  for (const [field, patch] of cases) {
    const { ctx } = mockCtx();
    await assertRejects(
      async () => await action.execute!(baseInput(patch), ctx),
      Error,
      `\`${field}\``,
    );
  }
});

Deno.test("incident-create: non-2xx response propagates as Error", async () => {
  const { ctx } = mockCtx([{ status: 400, body: '{"error":{"message":"bad request"}}' }]);
  await assertRejects(
    async () => await action.execute!(baseInput(), ctx),
    Error,
    "400",
  );
});
