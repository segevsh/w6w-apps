import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-room.ts";

Deno.test("get-room: GETs /rooms/{roomId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1" } }]);
  const result = await action.execute({ roomId: "r1" }, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/rooms/r1");
  assertEquals(result, { id: "r1" });
});

Deno.test("get-room: URL-encodes the room id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ roomId: "a/b c" }, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/rooms/a%2Fb%20c");
});
