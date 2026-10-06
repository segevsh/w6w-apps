import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import attributionGet from "../../actions/attribution-get.ts";

Deno.test("attribution-get: GET /attribution with required query", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [{ id: "1", revenue: 9 }] } }]);
  const out = await attributionGet.execute({
    attributionModel: "last_click",
    startDate: "2026-09-01T00:00:00",
    endDate: "2026-09-30T00:00:00",
    level: "facebook_ad",
    fields: "sales, revenue",
    ids: "1,2",
    scientificDaysRange: 7,
    dayOfAttribution: false,
  }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/attribution");
  assertEquals(q.level, "facebook_ad");
  assertEquals(q.fields, "sales,revenue");
  assertEquals(q.ids, "1,2");
  assertEquals(q.scientificDaysRange, "7");
  assertEquals(q.dayOfAttribution, "false");
  assertEquals(out, { result: [{ id: "1", revenue: 9 }] });
});

Deno.test("attribution-get: surfaces the in-flight duplicate error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "ERROR", message: ["Already processing a request for id: 1"] },
  }]);
  await assertRejects(
    async () =>
      await attributionGet.execute({
        attributionModel: "last_click",
        startDate: "a",
        endDate: "b",
        level: "google_ad",
        fields: "sales",
      }, ctx),
    Error,
    "Already processing",
  );
});
