import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-update.ts";

Deno.test("time-entry-update: PUTs /workspaces/{id}/time_entries/{id} with only set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 456, description: "renamed" } }]);
  await action.execute(
    { workspaceId: 123, timeEntryId: 456, description: "renamed" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v9/workspaces/123/time_entries/456");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), {
    workspace_id: 123,
    description: "renamed",
  });
});

Deno.test("time-entry-update: sends tags and billable when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 456 } }]);
  await action.execute(
    { workspaceId: 1, timeEntryId: 2, tags: ["a", "b"], billable: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    workspace_id: 1,
    tags: ["a", "b"],
    billable: true,
  });
});
