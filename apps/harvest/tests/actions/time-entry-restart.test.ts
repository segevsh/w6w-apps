import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-restart.ts";

test("time-entry-restart: PATCHes /time_entries/{id}/restart", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, is_running: true } }]);
  const result = await action.execute({ timeEntryId: "1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/time_entries/1/restart");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(result, { id: 1, is_running: true });
});
