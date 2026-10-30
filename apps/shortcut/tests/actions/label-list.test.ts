import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import labelList from "../../actions/label-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("label-list: calls GET /labels, forwarding slim", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await labelList.execute({ slim: true }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/labels");
  assertEquals(queryOf(calls[0].url), { slim: "true" });
});
