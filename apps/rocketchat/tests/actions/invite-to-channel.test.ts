import { assertEquals, assertThrows } from "@std/assert";
import a from "../../actions/invite-to-channel.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

Deno.test("invite-to-channel: one id uses the { roomId, userId } form", async () => {
  const { call, json } = await run(a, { roomId: "C", userIds: "U1" });
  assertEquals(call.url, `${BASE}/channels.invite`);
  assertEquals(json, { roomId: "C", userId: "U1" });
});

Deno.test("invite-to-channel: several ids use { roomId, userIds[] }; none is refused", async () => {
  const { json } = await run(a, { roomId: "C", userIds: "U1, U2" });
  assertEquals(json, { roomId: "C", userIds: ["U1", "U2"] });
  assertThrows(
    () => a.execute({ roomId: "C", userIds: " , " }, mockCtx().ctx),
    Error,
    "at least one user ID",
  );
});
