import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/incident-get.ts";

const conn = { display: { pageId: "pg1" } };

test("incident-get: reads one incident", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "inc1" } }], conn);
  await action.execute!({ incidentId: "inc1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/pg1/incidents/inc1");
});

test("incident-get: a missing id is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "incidentId");
});
