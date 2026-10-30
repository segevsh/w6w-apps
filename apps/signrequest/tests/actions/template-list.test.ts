import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import templateList from "../../actions/template-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("template-list: GETs /templates/ with page/limit", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  await templateList.execute({ page: 1, limit: 5 }, ctx);
  assertEquals(pathOf(calls[0]), "/api/v1/templates/");
  assertEquals(queryOf(calls[0]).get("limit"), "5");
});
