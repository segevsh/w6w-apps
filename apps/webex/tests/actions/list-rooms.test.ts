import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-rooms.ts";

test("list-rooms: GETs /rooms and returns items", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "r1" }] } }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/rooms");
  assertEquals(result, [{ id: "r1" }]);
});

test("list-rooms: passes filters through as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({ teamId: "t1", type: "group", sortBy: "created", max: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("teamId"), "t1");
  assertEquals(url.searchParams.get("type"), "group");
  assertEquals(url.searchParams.get("sortBy"), "created");
  assertEquals(url.searchParams.get("max"), "10");
});

test("list-rooms: an empty items array is returned as-is", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await action.execute({}, ctx);
  assertEquals(result, []);
});
