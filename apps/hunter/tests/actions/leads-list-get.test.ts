import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/leads-list-get.ts";

test("leads-list-get: GETs /leads_lists/{id} with its embedded leads paginated", async () => {
  const body = envelope({ id: 1, name: "My leads", leads: [] });
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ id: 1, limit: 5 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/leads_lists/1");
  assertEquals(result, body);
});
