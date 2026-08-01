import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/incident-acknowledge.ts";

Deno.test("incident-acknowledge: PUTs status=acknowledged with the From header", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { incident: { id: "P1", status: "acknowledged" } },
  }]);
  const result = await action.execute!({ incidentId: "P1", from: "user@example.com" }, ctx);

  assertEquals(calls[0].url, "https://api.pagerduty.com/incidents/P1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].headers["from"], "user@example.com");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body, { incident: { type: "incident", status: "acknowledged" } });
  assertEquals(result, { id: "P1", status: "acknowledged" });
});

Deno.test("incident-acknowledge: missing incidentId or from rejects", async () => {
  for (const patch of [{ incidentId: "" }, { from: "" }]) {
    const { ctx } = mockCtx();
    await assertRejects(
      async () =>
        await action.execute!({ incidentId: "P1", from: "user@example.com", ...patch }, ctx),
      Error,
    );
  }
});
