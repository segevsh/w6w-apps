import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-report.ts";

test("delete-report: DELETEs [/groups/{id}]/reports/{reportId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await action.execute({ groupId: "w1", reportId: "r1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/reports/r1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.status, 200);
});

test("delete-report: idempotent — a re-delete converges on gone", () => {
  assertEquals(action.idempotent, true);
});
