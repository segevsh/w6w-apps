import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import statusDelete from "../../actions/status-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("status-delete - DELETEs /status/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await statusDelete.execute({ status_id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/status/1");
  assertEquals(out, { deleted: true, status_id: 1 });
});
