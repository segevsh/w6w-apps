import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-delete.ts";

test("time-entry-delete: DELETEs /time_entries/{id} and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const result = await action.execute({ timeEntryId: "1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/time_entries/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { success: true });
});
