import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import pageGet from "../../actions/page-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("page-get: calls GET /pages/{id} and returns test stats", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "p1", name: "Landing", tests: { current: { visits: 3 } } } },
  ]);
  const out = await pageGet.execute({ pageId: "p1" }, ctx) as { tests: { current: unknown } };

  assertEquals(pathOf(calls[0].url), "/pages/p1");
  assertEquals(out.tests.current, { visits: 3 });
});
