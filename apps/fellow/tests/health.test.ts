import { assertEquals } from "@std/assert";
import service, { mapComponentStatus, mapIndicator, STATUS_URL } from "../health/service.ts";
import rateLimit from "../health/rate-limit.ts";
import { mockCtx } from "./_helpers.ts";

const summary = (api: string, website = "operational", indicator = "none") => ({
  page: { name: "Fellow", url: "https://status.fellow.ai/" },
  status: { indicator },
  components: [
    { id: "a", name: "Website", status: website },
    { id: "b", name: "Developer API", status: api },
  ],
});

// deno-lint-ignore no-explicit-any
const run = (ctx: any) => (service.check as any)({}, ctx);

Deno.test("health.service: verdict is the Developer API component's, not the page roll-up", async () => {
  const web = mockCtx([{ body: summary("operational", "major_outage", "critical") }]);
  assertEquals((await run(web.ctx)).state, "ok");
  assertEquals(web.calls[0].url, STATUS_URL);

  const api = mockCtx([{ body: summary("major_outage") }]);
  const r = await run(api.ctx);
  assertEquals(r.state, "down");
  assertEquals(r.message, "affected: Developer API (major_outage)");
});

Deno.test("health.service: falls back to the indicator without an API component; unreadable pages are unknown", async () => {
  const noApi = mockCtx([{
    body: {
      page: { url: "https://status.fellow.ai/" },
      status: { indicator: "minor" },
      components: [{ id: "x", name: "Website", status: "operational" }],
    },
  }]);
  assertEquals((await run(noApi.ctx)).state, "degraded");
  assertEquals((await run(mockCtx([{ status: 500, body: "x" }]).ctx)).state, "unknown");
  assertEquals((await run(mockCtx([{ body: "not json" }]).ctx)).state, "unknown");
  assertEquals(
    (await run(
      mockCtx([{
        body: {
          page: { url: "https://status.other.com/" },
          components: [{ name: "A", status: "operational" }],
        },
      }]).ctx,
    )).state,
    "unknown",
  );
  assertEquals((await run(mockCtx([{ body: { components: [] } }]).ctx)).state, "unknown");
});

Deno.test("health.service: status vocabulary maps", () => {
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("weird"), "unknown");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("health.rate-limit: a declared absence with informational severity and no hook", () => {
  assertEquals(rateLimit.severity, "informational");
  assertEquals(typeof rateLimit.unavailable?.reason, "string");
  assertEquals((rateLimit as { check?: unknown }).check, undefined);
});
