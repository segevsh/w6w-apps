import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import labelDelete from "../../actions/label-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("label-delete: DELETE /labels/:id returns 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await labelDelete.execute({ id: 25 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/labels/25");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});
