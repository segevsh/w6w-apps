import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import affiliateDelete from "../../actions/affiliate-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("affiliate-delete: DELETEs by affiliate id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await affiliateDelete.execute({ affiliateId: "janejameson" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/affiliates/janejameson/");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { result: null });
});
