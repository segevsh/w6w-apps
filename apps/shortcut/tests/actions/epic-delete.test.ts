import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import epicDelete from "../../actions/epic-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("epic-delete: DELETEs and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await epicDelete.execute({ epicId: 9 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/epics/9");
  assertEquals(out, { status: 204 });
});
