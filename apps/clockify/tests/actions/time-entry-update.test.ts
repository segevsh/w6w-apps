import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-update.ts";

Deno.test("time-entry-update: PUTs with the supplied start", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "te1" } }]);
  await action.execute(
    {
      workspaceId: "ws1",
      timeEntryId: "te1",
      start: "2026-07-01T08:00:00Z",
      end: "2026-07-01T09:00:00Z",
    },
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/workspaces/ws1/time-entries/te1");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { end: "2026-07-01T09:00:00Z", start: "2026-07-01T08:00:00Z" });
});

Deno.test("time-entry-update: fetches current start when omitted (Clockify requires start on every PUT)", async () => {
  const { ctx, calls } = mockCtx([
    { body: { timeInterval: { start: "2026-07-01T08:00:00Z" } } },
    { body: { id: "te1" } },
  ]);
  await action.execute(
    { workspaceId: "ws1", timeEntryId: "te1", end: "2026-07-01T09:00:00Z" },
    ctx,
  );
  assertEquals(calls.length, 2);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[1].method, "PUT");
  const body = JSON.parse(calls[1].body!);
  assertEquals(body.start, "2026-07-01T08:00:00Z");
  assertEquals(body.end, "2026-07-01T09:00:00Z");
});
