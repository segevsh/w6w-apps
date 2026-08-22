import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/incident-resolve.ts";

const conn = { display: { pageId: "pg1" } };

/**
 * The mistake this action exists to prevent: a resolved incident above a row of
 * red components.
 */
Deno.test("incident-resolve: reads the incident and restores its components", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "inc1", components: [{ id: "c1" }, { id: "c2" }] } },
    { status: 200, body: { id: "inc1", status: "resolved" } },
  ], conn);
  const out = await action.execute!({ incidentId: "inc1", body: "All clear." }, ctx) as {
    restoredComponents: string[];
  };
  assertEquals(out.restoredComponents, ["c1", "c2"]);
  const sent = JSON.parse(calls[1].body!).incident;
  assertEquals(sent.status, "resolved");
  assertEquals(sent.components, { c1: "operational", c2: "operational" });
});

Deno.test("incident-resolve: the restore can be turned off for a partial recovery", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "inc1", status: "resolved" } }], conn);
  await action.execute!({ incidentId: "inc1", restoreComponents: false }, ctx);
  // No read of the incident — one request, not two.
  assertEquals(calls.length, 1);
  assertEquals("components" in JSON.parse(calls[0].body!).incident, false);
});

Deno.test("incident-resolve: explicit statuses override the blanket restore", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "inc1" } }], conn);
  await action.execute!({
    incidentId: "inc1",
    componentStatuses: '{"c1":"operational","c2":"degraded_performance"}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).incident.components, {
    c1: "operational",
    c2: "degraded_performance",
  });
});

Deno.test("incident-resolve: a missing incident id is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "incidentId");
  assertEquals(calls.length, 0);
});

Deno.test("incident-resolve: says why it restores components", () => {
  assert(/red dots|operational/.test(action.description!), action.description);
});
