import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import a from "../../actions/get-channel.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

test("get-channel: GET channels.info by roomId or roomName", async () => {
  const byId = await run(a, { roomId: "R" });
  assertEquals(byId.call.url, `${BASE}/channels.info?roomId=R`);
  const byName = await run(a, { roomName: "general" });
  assertEquals(byName.call.url, `${BASE}/channels.info?roomName=general`);
});

test("get-channel: refuses when neither is given", () => {
  assertThrows(() => a.execute({}, mockCtx().ctx), Error, "Room ID or a Room name");
});
