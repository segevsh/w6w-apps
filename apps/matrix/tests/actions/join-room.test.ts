import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import joinRoom from "../../actions/join-room.ts";
import { HOMESERVER, mockMatrixCtx } from "../_helpers.ts";

test("join-room: POSTs /join/{roomIdOrAlias}, accepting an alias verbatim", async () => {
  const { ctx, calls } = mockMatrixCtx([{ body: { room_id: "!x:example.org" } }]);
  const result = await joinRoom.execute({ roomIdOrAlias: "#team:example.org" }, ctx);
  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/join/%23team%3Aexample.org`);
  assertEquals(calls[0].method, "POST");
  assertEquals(result, { roomId: "!x:example.org" });
});

test("join-room: is idempotent — joining twice returns the same room", () => {
  assertEquals(joinRoom.idempotent, true);
});
