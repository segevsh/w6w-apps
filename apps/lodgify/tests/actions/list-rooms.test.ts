import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";
import listRooms from "../../actions/list-rooms.ts";

test("list-rooms: wraps the bare array as items", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }, { id: 2 }] }]);
  const out = await listRooms.execute({ propertyId: 7 }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v2/properties/7/rooms");
  assertEquals(out.items.length, 2);
});
