import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/incident-get.ts";

const conn = { display: { pageId: "pg1" } };

Deno.test("incident-get: reads one incident", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "inc1" } }], conn);
  await action.execute!({ incidentId: "inc1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/pg1/incidents/inc1");
});

Deno.test("incident-get: a missing id is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "incidentId");
});
