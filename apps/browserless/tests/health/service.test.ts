import { assertEquals } from "@std/assert";
import service, { mapResourceStatus, PAGE_ID } from "../../health/service.ts";
import { mockCtx, region } from "../_helpers.ts";

function page(statuses: Record<string, string>, id = PAGE_ID, company = "Browserless") {
  return {
    data: { id, attributes: { company_name: company } },
    included: Object.entries(statuses).map(([name, status], i) => ({
      id: String(i),
      type: "status_page_resource",
      attributes: { public_name: name, status },
    })),
  };
}

Deno.test("service: the connection's own region drives the verdict", async () => {
  const body = page({ "US West": "operational", "London": "downtime", "Amsterdam": "operational" });
  const sfo = mockCtx([{ body }], { connection: region("sfo") });
  const ok = await service.check!({}, sfo.ctx);
  assertEquals(ok.state, "ok");
  assertEquals(sfo.calls[0].url, "https://status.browserless.io/index.json");
  assertEquals(ok.components?.["london"]?.state, "degraded");

  const lon = mockCtx([{ body }], { connection: region("lon") });
  const down = await service.check!({}, lon.ctx);
  assertEquals(down.state, "down");
  assertEquals(down.components?.["london"]?.state, "down");
});

Deno.test("service: unknown when the page is not Browserless's or lacks the region", async () => {
  const wrongId = mockCtx([{ body: page({ "US West": "operational" }, "1") }]);
  assertEquals((await service.check!({}, wrongId.ctx)).state, "unknown");
  const wrongName = mockCtx([{ body: page({ "US West": "operational" }, PAGE_ID, "Acme") }]);
  assertEquals((await service.check!({}, wrongName.ctx)).state, "unknown");
  const absent = mockCtx([{ body: page({ "London": "operational" }) }]);
  assertEquals((await service.check!({}, absent.ctx)).state, "unknown");
});

Deno.test("service: a non-200 or non-JSON page is unknown", async () => {
  assertEquals(
    (await service.check!({}, mockCtx([{ status: 503, body: "x" }]).ctx)).state,
    "unknown",
  );
  const html = mockCtx([{ headers: { "content-type": "text/html" }, body: "<html/>" }]);
  assertEquals((await service.check!({}, html.ctx)).state, "unknown");
});

Deno.test("service: status mapping", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("maintenance"), "degraded");
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus("???"), "unknown");
  assertEquals(service.network?.allow, ["status.browserless.io"]);
});
