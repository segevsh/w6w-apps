import { assertEquals } from "@std/assert";
import service, { PAGE_ID, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const resource = (id: string, name: string, status = "operational") => ({
  id,
  type: "status_page_resource",
  attributes: { public_name: name, status },
});

function page(statuses: Record<string, string> = {}, id = PAGE_ID, company = "Brandfetch") {
  const names = [
    "Logo Link CDN",
    "Brand API",
    "Brand Context API",
    "Search API",
    "Developer Dashboard",
  ];
  return {
    data: { id, type: "status_page", attributes: { company_name: company } },
    included: [
      { id: "s", type: "status_page_section", attributes: {} },
      ...names.map((n, i) => resource(String(i), n, statuses[n] ?? "operational")),
    ],
  };
}

Deno.test("service: all watched resources operational is ok, from the page's /index.json", async () => {
  const { ctx, calls } = mockCtx([{ body: page() }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components!).includes("brand-api"), true);
});

Deno.test("service: the worst watched resource drives the verdict and is named", async () => {
  const { ctx } = mockCtx([{ body: page({ "Search API": "downtime", "Brand API": "degraded" }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.message, "Brand API (degraded); Search API (downtime)");
});

Deno.test("service: an unwatched resource down is capped at degraded and never drives it", async () => {
  const { ctx } = mockCtx([{ body: page({ "Developer Dashboard": "downtime" }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components!["developer-dashboard"].state, "degraded");
});

Deno.test("service: a foreign page, a missing Brand API resource or HTTP error is unknown", async () => {
  const foreign = mockCtx([{ body: page({}, "999", "Other") }]);
  assertEquals((await service.check!({}, foreign.ctx)).state, "unknown");
  const missing = mockCtx([{
    body: { ...page(), included: [resource("1", "Search API")] },
  }]);
  assertEquals((await service.check!({}, missing.ctx)).state, "unknown");
  const html = mockCtx([{ headers: { "content-type": "text/html" }, body: "<html>" }]);
  assertEquals((await service.check!({}, html.ctx)).state, "unknown");
  const err = mockCtx([{ status: 500 }]);
  assertEquals((await service.check!({}, err.ctx)).state, "unknown");
});
