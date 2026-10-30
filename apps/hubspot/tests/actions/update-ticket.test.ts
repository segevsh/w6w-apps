import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-ticket.ts";

test("update-ticket: PATCHes /crm/v3/objects/tickets/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute!({ id: "t1", properties: { hs_pipeline_stage: "3" } }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/tickets/t1");
});
