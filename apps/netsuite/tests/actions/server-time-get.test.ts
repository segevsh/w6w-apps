import { assertEquals } from "@std/assert";
import serverTimeGet from "../../actions/server-time-get.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

Deno.test("server-time-get: GETs system/v1/serverTime", async () => {
  const { ctx, calls } = mockCtx([{ body: { serverTime: "2025-03-26T16:21:00.000Z" } }]);
  const out = await run(serverTimeGet, {}, ctx);
  assertEquals(calls[0].url, `${BASE}/services/rest/system/v1/serverTime`);
  assertEquals(out, { serverTime: "2025-03-26T16:21:00.000Z" });
});
