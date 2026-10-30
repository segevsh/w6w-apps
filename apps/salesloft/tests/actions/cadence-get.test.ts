import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cadence-get.ts";

test("cadence-get: GETs /cadences/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 12, name: "Outbound" } } }]);
  const result = await action.execute!({ id: 12 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/cadences/12");
  assertEquals(result, { data: { id: 12, name: "Outbound" } });
});
