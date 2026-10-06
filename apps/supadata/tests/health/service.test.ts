import { assertEquals } from "@std/assert";
import service, { API_RESOURCE, mapResourceStatus, PAGE_ID } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function page(statuses: Record<string, string>, id = PAGE_ID, company = "Supadata") {
  return {
    data: { id, attributes: { company_name: company } },
    included: Object.entries(statuses).map(([name, status], i) => ({
      id: String(i),
      type: "status_page_resource",
      attributes: { public_name: name, status },
    })),
  };
}

Deno.test("service: the Transcript API resource drives the verdict; Dashboard is capped at degraded", async () => {
  const { ctx, calls } = mockCtx([
    { body: page({ [API_RESOURCE]: "operational", "Dashboard": "downtime" }) },
    { body: page({ [API_RESOURCE]: "downtime", "Dashboard": "operational" }) },
  ]);
  const ok = await service.check!({}, ctx);
  assertEquals(ok.state, "ok");
  assertEquals(calls[0].url, "https://status.supadata.ai/index.json");
  assertEquals(ok.components?.["dashboard"]?.state, "degraded");
  const down = await service.check!({}, ctx);
  assertEquals(down.state, "down");
  assertEquals(down.components?.["transcript-api"]?.state, "down");
});

Deno.test("service: unknown when the page is not Supadata's or lacks the resource", async () => {
  const wrongId = mockCtx([{ body: page({ [API_RESOURCE]: "operational" }, "1") }]);
  assertEquals((await service.check!({}, wrongId.ctx)).state, "unknown");
  const wrongName = mockCtx([{ body: page({ [API_RESOURCE]: "operational" }, PAGE_ID, "Acme") }]);
  assertEquals((await service.check!({}, wrongName.ctx)).state, "unknown");
  const absent = mockCtx([{ body: page({ "Dashboard": "operational" }) }]);
  assertEquals((await service.check!({}, absent.ctx)).state, "unknown");
});

Deno.test("service: a non-200 or non-JSON page is unknown; status mapping", async () => {
  assertEquals(
    (await service.check!({}, mockCtx([{ status: 503, body: "x" }]).ctx)).state,
    "unknown",
  );
  const html = mockCtx([{ headers: { "content-type": "text/html" }, body: "<html></html>" }]);
  assertEquals((await service.check!({}, html.ctx)).state, "unknown");
  assertEquals(
    ["operational", "maintenance", "downtime", "weird", undefined].map(mapResourceStatus),
    ["ok", "degraded", "down", "unknown", "unknown"],
  );
});
