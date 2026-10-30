import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import leaveRoom from "../../actions/leave-room.ts";
import { HOMESERVER, mockMatrixCtx } from "../_helpers.ts";

test("leave-room: POSTs /rooms/{roomId}/leave", async () => {
  const { ctx, calls } = mockMatrixCtx([{ body: {} }]);
  const result = await leaveRoom.execute({ roomId: "!x:example.org", reason: "bye" }, ctx);
  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/rooms/!x%3Aexample.org/leave`);
  assertEquals(JSON.parse(calls[0].body!), { reason: "bye" });
  assertEquals(result, { left: true });
});

test("leave-room: is idempotent", () => {
  assertEquals(leaveRoom.idempotent, true);
});
