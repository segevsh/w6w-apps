import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-report.ts";

test("get-report: GETs [/groups/{id}]/reports/{reportId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", name: "Sales" } }]);
  const out = await action.execute({ reportId: "r1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/reports/r1");
  assertEquals(out, { id: "r1", name: "Sales" });
});

test("get-report: scopes into a named workspace when Workspace ID is set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ groupId: "w1", reportId: "r1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/reports/r1");
});
