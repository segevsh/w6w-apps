import { assertEquals } from "@std/assert";
import timeZoneList from "../../actions/time-zone-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("time-zone-list: GET /v1/time_zones, wraps the array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "UTC" }] }]);
  const out = await timeZoneList.execute(
    { instant: "2026-10-06T00:00:00Z", includeLegacy: true },
    ctx,
  ) as { timeZones: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/time_zones");
  assertEquals(queryOf(calls[0].url), {
    instant: "2026-10-06T00:00:00Z",
    include_legacy: "true",
  });
  assertEquals(out.timeZones, [{ id: "UTC" }]);
});

Deno.test("time-zone-list: includeLegacy=false sends nothing", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await timeZoneList.execute({ includeLegacy: false }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
