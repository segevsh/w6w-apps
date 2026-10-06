import { assertEquals, assertThrows } from "@std/assert";
import a from "../../actions/list-channel-members.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

Deno.test("list-channel-members: GET channels.members with filter, sort and paging", async () => {
  const { call, query } = await run(a, {
    roomName: "general",
    filter: "ali",
    count: 5,
    sort: '{"username":1}',
  });
  assertEquals(call.url.split("?")[0], `${BASE}/channels.members`);
  assertEquals(query.get("roomName"), "general");
  assertEquals(query.get("filter"), "ali");
  assertEquals(query.get("sort"), '{"username":1}');
});

Deno.test("list-channel-members: refuses without a room", () => {
  assertThrows(() => a.execute({}, mockCtx().ctx), Error, "Room ID or a Room name");
});
