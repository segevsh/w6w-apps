import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import fundDelete from "../../actions/fund-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("fund-delete: DELETEs /funds/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await fundDelete.execute({ id: "1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/funds/1");
  assertEquals(out, { status: 200 });
});
