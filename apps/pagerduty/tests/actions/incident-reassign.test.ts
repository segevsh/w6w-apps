import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/incident-reassign.ts";

Deno.test("incident-reassign: builds an assignments array from comma-separated user IDs", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { incident: { id: "P1" } } }]);
  const result = await action.execute!(
    { incidentId: "P1", from: "user@example.com", userIds: "U1, U2" },
    ctx,
  );

  assertEquals(calls[0].url, "https://api.pagerduty.com/incidents/P1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].headers["from"], "user@example.com");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.incident.assignments, [
    { assignee: { id: "U1", type: "user_reference" } },
    { assignee: { id: "U2", type: "user_reference" } },
  ]);
  assertEquals(result, { id: "P1" });
});

Deno.test("incident-reassign: missing incidentId, from, or userIds rejects", async () => {
  const base = { incidentId: "P1", from: "user@example.com", userIds: "U1" };
  for (const patch of [{ incidentId: "" }, { from: "" }, { userIds: "" }]) {
    const { ctx } = mockCtx();
    await assertRejects(
      async () => await action.execute!({ ...base, ...patch }, ctx),
      Error,
    );
  }
});
