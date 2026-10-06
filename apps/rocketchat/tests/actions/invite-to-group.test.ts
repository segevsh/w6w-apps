import { assertEquals, assertThrows } from "@std/assert";
import a from "../../actions/invite-to-group.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

Deno.test("invite-to-group: one username uses `username`, and a leading @ is stripped", async () => {
  const { call, json } = await run(a, { roomId: "G", usernames: "@alice" });
  assertEquals(call.url, `${BASE}/groups.invite`);
  assertEquals(json, { roomId: "G", username: "alice" });
});

Deno.test("invite-to-group: several use `usernames[]`; needs a room and a name", async () => {
  const { json } = await run(a, { roomName: "secret", usernames: "alice, bob" });
  assertEquals(json, { roomName: "secret", usernames: ["alice", "bob"] });
  assertThrows(() => a.execute({ usernames: "a" }, mockCtx().ctx), Error, "Room ID or a Room name");
  assertThrows(
    () => a.execute({ roomId: "G", usernames: " " }, mockCtx().ctx),
    Error,
    "at least one username",
  );
});
