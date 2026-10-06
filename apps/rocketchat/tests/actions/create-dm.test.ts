import { assertEquals, assertThrows } from "@std/assert";
import a from "../../actions/create-dm.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

Deno.test("create-dm: one username uses `username`", async () => {
  const { call, json } = await run(a, { usernames: "@bob" }, { room: { rid: "R" } });
  assertEquals(call.url, `${BASE}/dm.create`);
  assertEquals(json, { username: "bob" });
});

Deno.test("create-dm: several usernames are sent comma-joined as `usernames`", async () => {
  const { json } = await run(a, { usernames: "bob, carol", excludeSelf: true });
  assertEquals(json, { usernames: "bob,carol", excludeSelf: true });
  assertThrows(() => a.execute({ usernames: "" }, mockCtx().ctx), Error, "at least one username");
});
