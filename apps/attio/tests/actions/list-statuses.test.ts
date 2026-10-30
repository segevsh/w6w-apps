import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import listStatuses from "../../actions/list-statuses.ts";

test("list-statuses: builds the …/attributes/{attribute}/statuses path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await listStatuses.execute({ target: "lists", identifier: "sales", attribute: "stage" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/lists/sales/attributes/stage/statuses");
});
