import { assert, assertEquals } from "@std/assert";
import service, { mapComponentStatus, PAGE_NAME, STATUS_URL } from "../health/service.ts";
import quota from "../health/quota.ts";
import { mockCtx } from "./_helpers.ts";

function page(api = "operational", e2e = "operational", site = "operational") {
  return {
    page: { name: PAGE_NAME, url: "https://status.synthflow.ai/" },
    status: { indicator: "none" },
    components: [
      { id: "1", name: "Synthflow Dashboard", status: "operational" },
      { id: "2", name: "Synthflow API", status: api },
      { id: "3", name: "End to End calling", status: e2e },
      { id: "4", name: "Synthflow Website", status: site },
    ],
  };
}

Deno.test("service: all operational is ok and hits the summary feed", async () => {
  const { ctx, calls } = mockCtx([{ body: page() }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!).length, 4);
});

Deno.test("service: an API outage is down", async () => {
  const { ctx } = mockCtx([{ body: page("full_outage") }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "down");
  assert(r.message!.includes("Synthflow API"));
});

Deno.test("service: degraded calling is degraded", async () => {
  const { ctx } = mockCtx([{ body: page("operational", "partial_outage") }]);
  assertEquals((await service.check!({} as never, ctx)).state, "degraded");
});

Deno.test("service: the marketing website never moves the verdict", async () => {
  const { ctx } = mockCtx([{ body: page("operational", "operational", "full_outage") }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.components!["synthflow-website"].state, "down");
});

Deno.test("service: a broken or foreign page is unknown, never down", async () => {
  assertEquals(
    (await service.check!({} as never, mockCtx([{ status: 503, body: "x" }]).ctx)).state,
    "unknown",
  );
  const foreign = { ...page(), page: { name: "Other", url: "https://status.other.com/" } };
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: foreign }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!(
      {} as never,
      mockCtx([{ body: { page: page().page, components: [] } }]).ctx,
    )).state,
    "unknown",
  );
});

Deno.test("service: component vocabulary", () => {
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
});

Deno.test("quota: declared unavailable, informational", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.check, "undefined");
  assert((quota.unavailable?.reason?.length ?? 0) > 0);
});
