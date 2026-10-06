import { assertEquals } from "@std/assert";
import service, {
  mapComponentStatus,
  mapIndicator,
  PAGE_ID,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-10-06. */
function summary(over: { api?: string; website?: string; page?: unknown; status?: unknown } = {}) {
  return {
    page: over.page ?? { id: PAGE_ID, name: "HTML/CSS to Image API" },
    components: [
      { id: "glctt95rs9rp", name: "API", status: over.api ?? "operational", group: false },
      { id: "hlkm7r22wplp", name: "Website", status: over.website ?? "operational", group: false },
    ],
    incidents: [],
    status: over.status ?? { indicator: "none", description: "All Systems Operational" },
  };
}

Deno.test("service: probes the status host unsigned, not hcti.io", () => {
  assertEquals(STATUS_URL, "https://status.htmlcsstoimage.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.htmlcsstoimage.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
});

Deno.test("service: all operational reports ok with both components", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  assertEquals(r.message, "All Systems Operational");
  assertEquals(Object.keys(r.components ?? {}).sort(), ["glctt95rs9rp", "hlkm7r22wplp"]);
});

Deno.test("service: the API component decides the verdict", async () => {
  const major = mockCtx([{ body: summary({ api: "major_outage" }) }]);
  assertEquals((await service.check!({}, major.ctx)).state, "down");
  const partial = mockCtx([{ body: summary({ api: "partial_outage" }) }]);
  assertEquals((await service.check!({}, partial.ctx)).state, "degraded");
});

Deno.test("service: a website-only incident is named but never moves the verdict", async () => {
  const { ctx } = mockCtx([{ body: summary({ website: "major_outage" }) }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.message?.includes("Website (major_outage)"), true, r.message);
});

Deno.test("service: a page with a different id is not trusted", async () => {
  const { ctx } = mockCtx([{ body: summary({ page: { id: "other", name: "Someone else" } }) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: HTTP errors and junk bodies are unknown, never down", async () => {
  const a = mockCtx([{ status: 503, body: "oops" }]);
  assertEquals((await service.check!({}, a.ctx)).state, "unknown");
  const b = mockCtx([{ body: "not json" }]);
  assertEquals((await service.check!({}, b.ctx)).state, "unknown");
  const c = mockCtx([{ body: { page: { id: PAGE_ID }, components: [] } }]);
  assertEquals((await service.check!({}, c.ctx)).state, "unknown");
});

Deno.test("service: without an API component it falls back to the page indicator", async () => {
  const body = {
    page: { id: PAGE_ID },
    components: [{ id: "x", name: "Something", status: "operational" }],
    status: { indicator: "critical", description: "Down" },
  };
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: status vocabularies map as Statuspage documents them", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});
