import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-get.ts";

Deno.test("time-entry-get: GETs /workspaces/{id}/time-entries/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "te1" } }]);
  const result = await action.execute({ workspaceId: "ws1", timeEntryId: "te1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/workspaces/ws1/time-entries/te1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: "te1" });
});
