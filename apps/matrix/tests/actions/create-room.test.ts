import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import createRoom from "../../actions/create-room.ts";
import { HOMESERVER, mockMatrixCtx } from "../_helpers.ts";

test("create-room: POSTs /createRoom with the compacted body", async () => {
  const { ctx, calls } = mockMatrixCtx([{ body: { room_id: "!newroom:example.org" } }]);
  const result = await createRoom.execute(
    { name: "Team Updates", preset: "public_chat", invite: "@bob:example.org, @carol:example.org" },
    ctx,
  );
  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/createRoom`);
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Team Updates");
  assertEquals(body.preset, "public_chat");
  assertEquals(body.invite, ["@bob:example.org", "@carol:example.org"]);
  assertEquals(body.visibility, "private");
  assertEquals("topic" in body, false);
  assertEquals(result, { roomId: "!newroom:example.org" });
});

test("create-room: is not idempotent — a retry must not be assumed safe", () => {
  assertEquals(createRoom.idempotent, false);
});
