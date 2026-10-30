import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-delete.ts";

test("time-entry-delete: DELETEs /workspaces/{id}/time_entries/{id} and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const result = await action.execute({ workspaceId: 123, timeEntryId: 456 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v9/workspaces/123/time_entries/456");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { success: true });
});
