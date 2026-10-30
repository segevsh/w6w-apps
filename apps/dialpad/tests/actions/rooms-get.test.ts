import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import roomsGet from "../../actions/rooms-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("rooms-get: GETs /rooms/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await roomsGet.execute({ roomId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/rooms/1");
});
