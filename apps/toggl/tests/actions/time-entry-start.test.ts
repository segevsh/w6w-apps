import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-start.ts";

Deno.test("time-entry-start: POSTs /workspaces/{id}/time_entries with duration -1", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, duration: -1 } }]);
  await action.execute(
    {
      workspaceId: 123,
      description: "wrote code",
      projectId: 1,
      start: "2026-07-01T08:00:00Z",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v9/workspaces/123/time_entries");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    workspace_id: 123,
    created_with: "w6w",
    start: "2026-07-01T08:00:00Z",
    duration: -1,
    description: "wrote code",
    project_id: 1,
  });
});

Deno.test("time-entry-start: defaults start to now when omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute({ workspaceId: 123 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(typeof body.start, "string");
  assertEquals(body.start.endsWith("Z"), true);
  assertEquals(body.duration, -1);
});
