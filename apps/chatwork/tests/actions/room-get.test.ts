import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import roomGet from "../../actions/room-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("room-get: calls GET /rooms/{room_id}", async () => {
  const room = { room_id: 123, name: "Team", description: "General" };
  const { ctx, calls } = mockCtx([{ body: room }]);
  const out = await roomGet.execute({ roomId: "123" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/123");
  assertEquals(out, room);
});
