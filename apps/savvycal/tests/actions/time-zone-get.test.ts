import { assertEquals } from "@std/assert";
import timeZoneGet from "../../actions/time-zone-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("time-zone-get: slashes in the zone id are kept as path segments", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "America/New_York" } }]);
  const out = await timeZoneGet.execute({
    timeZone: "America/New_York",
    instant: "2026-07-01T00:00:00Z",
  }, ctx) as {
    id: string;
  };
  assertEquals(pathOf(calls[0].url), "/v1/time_zones/America/New_York");
  assertEquals(queryOf(calls[0].url), { instant: "2026-07-01T00:00:00Z" });
  assertEquals(out.id, "America/New_York");
});

Deno.test("time-zone-get: each segment is escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await timeZoneGet.execute({ timeZone: "Etc/GMT+5 x" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/time_zones/Etc/GMT%2B5%20x");
});
