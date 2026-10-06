import { assertEquals } from "@std/assert";
import a from "../../actions/get-dm-history.ts";
import { BASE, run } from "../_helpers.ts";

Deno.test("get-dm-history: GET dm.history with roomId and the range", async () => {
  const { call, query } = await run(a, {
    roomId: "D",
    latest: "2026-10-02T00:00:00.000Z",
    inclusive: false,
    count: 5,
  });
  assertEquals(call.url.split("?")[0], `${BASE}/dm.history`);
  assertEquals(query.get("roomId"), "D");
  assertEquals(query.get("latest"), "2026-10-02T00:00:00.000Z");
  assertEquals(query.get("inclusive"), "false");
});

Deno.test("get-dm-history: returns the response untouched", async () => {
  const { result } = await run(a, { roomId: "D" }, { messages: [{ _id: "1" }, { _id: "2" }] });
  assertEquals((result as { messages: unknown[] }).messages.length, 2);
});
