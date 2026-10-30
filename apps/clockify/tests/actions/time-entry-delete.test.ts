import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-delete.ts";

test("time-entry-delete: DELETEs and reports deleted:true", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ workspaceId: "ws1", timeEntryId: "te1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/workspaces/ws1/time-entries/te1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
});
