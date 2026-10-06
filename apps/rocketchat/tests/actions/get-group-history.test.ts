import { assertEquals } from "@std/assert";
import a from "../../actions/get-group-history.ts";
import { BASE, run } from "../_helpers.ts";

Deno.test("get-group-history: GET groups.history with roomId and range", async () => {
  const { call, query } = await run(a, {
    roomId: "G",
    oldest: "2026-10-01T00:00:00.000Z",
    unreads: true,
    count: 10,
  });
  assertEquals(call.url.split("?")[0], `${BASE}/groups.history`);
  assertEquals(query.get("roomId"), "G");
  assertEquals(query.get("oldest"), "2026-10-01T00:00:00.000Z");
  assertEquals(query.get("unreads"), "true");
});

Deno.test("get-group-history: roomId is required (no name lookup on this endpoint)", () => {
  assertEquals(a.params?.find((p) => p.key === "roomId")?.required, true);
  assertEquals(a.params?.some((p) => p.key === "roomName"), false);
});
