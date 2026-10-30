import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-asset.ts";

test("delete-asset: DELETEs /rest/v1/assets/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ assetId: "A1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/assets/A1");
  assertEquals(result, { deleted: true, assetId: "A1" });
});
