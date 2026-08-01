import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-stop.ts";

Deno.test("time-entry-stop: PATCHes /workspaces/{id}/time_entries/{id}/stop", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, duration: 120 } }]);
  const result = await action.execute({ workspaceId: 123, timeEntryId: 456 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v9/workspaces/123/time_entries/456/stop");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(result, { id: 1, duration: 120 });
});
