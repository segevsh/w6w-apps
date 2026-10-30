import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/response-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("response-delete: deletes one or more comma-separated ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ ids: "r1, r2" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/responses/r1,r2");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});
