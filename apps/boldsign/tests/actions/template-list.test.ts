import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import templateList from "../../actions/template-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("template-list: always sends Page and forwards optional filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [] } }]);
  await templateList.execute({ page: 1, searchKey: "NDA" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/template/list");
  const q = queryOf(calls[0]);
  assertEquals(q.get("Page"), "1");
  assertEquals(q.get("SearchKey"), "NDA");
});
