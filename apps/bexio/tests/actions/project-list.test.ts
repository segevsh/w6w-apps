import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

test("project-list: GETs /2.0/pr_project with mapped query", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Relaunch" }] }]);
  const result = await action.execute!({ orderBy: "name" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/pr_project");
  assertEquals(url.searchParams.get("order_by"), "name");
  assertEquals(result, [{ id: 1, name: "Relaunch" }]);
});
