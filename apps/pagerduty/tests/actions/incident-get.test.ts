import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/incident-get.ts";

Deno.test("incident-get: fetches by id and unwraps `.incident`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { incident: { id: "P123" } } }]);
  const result = await action.execute!({ incidentId: "P123" }, ctx);
  assertEquals(calls[0].url, "https://api.pagerduty.com/incidents/P123");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: "P123" });
});

Deno.test("incident-get: missing incidentId rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ incidentId: "" }, ctx),
    Error,
    "incidentId",
  );
});

Deno.test("incident-get: non-2xx propagates as Error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "not found" }]);
  await assertRejects(
    async () => await action.execute!({ incidentId: "PXXX" }, ctx),
    Error,
    "404",
  );
});
