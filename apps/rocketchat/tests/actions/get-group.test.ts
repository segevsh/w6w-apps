import { assertEquals, assertThrows } from "@std/assert";
import a from "../../actions/get-group.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

Deno.test("get-group: GET groups.info by roomId or roomName", async () => {
  assertEquals((await run(a, { roomId: "G" })).call.url, `${BASE}/groups.info?roomId=G`);
  assertEquals(
    (await run(a, { roomName: "secret" })).call.url,
    `${BASE}/groups.info?roomName=secret`,
  );
});

Deno.test("get-group: refuses when neither is given", () => {
  assertThrows(() => a.execute({}, mockCtx().ctx), Error, "Room ID or a Room name");
});
