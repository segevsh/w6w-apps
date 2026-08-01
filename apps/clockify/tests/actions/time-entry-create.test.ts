import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-create.ts";

Deno.test("time-entry-create: POSTs /workspaces/{id}/time-entries", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "te1" } }]);
  await action.execute(
    {
      workspaceId: "ws1",
      start: "2026-07-01T08:00:00Z",
      description: "wrote code",
      projectId: "p1",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/workspaces/ws1/time-entries");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    start: "2026-07-01T08:00:00Z",
    description: "wrote code",
    projectId: "p1",
  });
});

Deno.test("time-entry-create: omitting end starts a running timer (no end in body)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "te1" } }]);
  await action.execute({ workspaceId: "ws1", start: "2026-07-01T08:00:00Z" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("end" in body, false);
});
