import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/meeting-create.ts";

Deno.test("meeting-create: POSTs /users/me/meetings by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, join_url: "https://zoom.us/j/1" } }]);
  await action.execute({ topic: "Standup" }, ctx);
  assertEquals(calls[0].url, "https://api.zoom.us/v2/users/me/meetings");
  assertEquals(JSON.parse(calls[0].body!), { topic: "Standup", type: 2 });
});

Deno.test("meeting-create: scopes to another user when one is named", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ topic: "x", userId: "jo@acme.test" }, ctx);
  assertEquals(calls[0].url, "https://api.zoom.us/v2/users/jo%40acme.test/meetings");
});

Deno.test("meeting-create: maps startTime onto Zoom's start_time", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { topic: "x", startTime: "2026-08-01T10:00:00Z", duration: 30, timezone: "Europe/London" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.start_time, "2026-08-01T10:00:00Z");
  assertEquals(body.duration, 30);
  assertEquals(body.timezone, "Europe/London");
});

Deno.test("meeting-create: the start time only shows for the timed meeting types", () => {
  assertEquals(action.params?.find((p) => p.key === "startTime")?.showIf, {
    field: "type",
    in: [2, 8],
  });
});
