import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import teammateList from "../../actions/teammate-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("teammate-list: GET /v2/teammates with service and property filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await teammateList.execute({
    service_id: 1,
    property_id: "p1",
    include: "properties",
    per_page: 5,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/teammates");
  assertEquals(queryOf(calls[0].url), {
    service_id: "1",
    property_id: "p1",
    include: "properties",
    per_page: "5",
  });
});
