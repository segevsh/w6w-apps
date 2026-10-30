import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-reports.ts";

test("list-reports: no Workspace ID means My workspace — /reports with no /groups segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/reports");
});

test("list-reports: a Workspace ID inserts /groups/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "r1" }] } }]);
  const out = await action.execute({ groupId: "w1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/reports");
  assertEquals(out.value, [{ id: "r1" }]);
});
