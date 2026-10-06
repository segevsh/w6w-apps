import { assertEquals, assertThrows } from "@std/assert";
import a from "../../actions/get-channel-history.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

Deno.test("get-channel-history: GET channels.history with the time range and flags", async () => {
  const { call, query } = await run(a, {
    roomId: "R",
    latest: "2026-10-02T00:00:00.000Z",
    oldest: "2026-10-01T00:00:00.000Z",
    inclusive: true,
    showThreadMessages: false,
    count: 50,
    offset: 0,
  });
  assertEquals(call.url.split("?")[0], `${BASE}/channels.history`);
  assertEquals(query.get("latest"), "2026-10-02T00:00:00.000Z");
  assertEquals(query.get("oldest"), "2026-10-01T00:00:00.000Z");
  assertEquals(query.get("inclusive"), "true");
  assertEquals(query.get("showThreadMessages"), "false");
  assertEquals(query.get("count"), "50");
});

Deno.test("get-channel-history: needs a room id or name and returns messages untouched", async () => {
  assertThrows(() => a.execute({}, mockCtx().ctx), Error, "Room ID or a Room name");
  const { result } = await run(a, { roomName: "general" }, { messages: [{ _id: "m" }] });
  assertEquals((result as { messages: unknown[] }).messages.length, 1);
});
