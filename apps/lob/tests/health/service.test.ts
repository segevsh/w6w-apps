import { assert, assertEquals } from "@std/assert";
import service, {
  mapComponentStatus,
  mapIndicator,
  STATUS_PAGE_ID,
  STATUS_URL,
} from "../../health/service.ts";
import rateLimit from "../../health/rate-limit.ts";
import { mockCtx } from "../_helpers.ts";

const summary = (over: Record<string, unknown> = {}) => ({
  page: { id: STATUS_PAGE_ID, name: "Lob", url: "http://status.lob.com" },
  components: [
    { id: "c1", name: "API", status: "operational", group: false },
    { id: "c2", name: "Dashboard", status: "operational", group: false },
    { id: "c3", name: "Webhooks", status: "operational", group: false },
  ],
  incidents: [],
  scheduled_maintenances: [],
  status: { indicator: "none", description: "All Systems Operational" },
  ...over,
});

Deno.test("service: fetches the lob.statuspage.io summary, unsigned, and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(new URL(STATUS_URL).host, "lob.statuspage.io");
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components ?? {}).length, 3);
});

Deno.test("service: the page indicator is the verdict, components are the detail", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      components: [
        { id: "c1", name: "API", status: "partial_outage" },
        { id: "c2", name: "Dashboard", status: "operational" },
      ],
      status: { indicator: "minor", description: "Minor Service Outage" },
      incidents: [{ name: "Errors", status: "investigating" }],
    }),
  }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "degraded");
  assert(out.message?.includes("API (partial_outage)"));
  assert(out.message?.includes("1 open incident"));
});

Deno.test("service: a critical indicator is down; a missing indicator falls back to components", async () => {
  const down = mockCtx([{ body: summary({ status: { indicator: "critical" } }) }]);
  assertEquals((await service.check!({} as never, down.ctx)).state, "down");
  const noIndicator = mockCtx([{
    body: summary({
      status: undefined,
      components: [{ id: "a", name: "API", status: "major_outage" }],
    }),
  }]);
  assertEquals((await service.check!({} as never, noIndicator.ctx)).state, "down");
});

Deno.test("service: a different page id or name is unknown, not ok", async () => {
  const wrongId = mockCtx([{ body: summary({ page: { id: "other", name: "Lob" } }) }]);
  assertEquals((await service.check!({} as never, wrongId.ctx)).state, "unknown");
  const wrongName = mockCtx([{
    body: summary({ page: { id: STATUS_PAGE_ID, name: "Someone Else" } }),
  }]);
  assertEquals((await service.check!({} as never, wrongName.ctx)).state, "unknown");
});

Deno.test("service: an unreachable, unreadable or empty status page is unknown, never down", async () => {
  assertEquals(
    (await service.check!({} as never, mockCtx([{ status: 503, body: "x" }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: "<html>" }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: summary({ components: [] }) }]).ctx)).state,
    "unknown",
  );
});

Deno.test("service: declares no credential and an unsigned status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["lob.statuspage.io"]);
});

Deno.test("mapComponentStatus / mapIndicator cover Statuspage's vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("weird"), "unknown");
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("rate-limit: is an informational quota check declared unavailable with a reason", () => {
  assertEquals(rateLimit.kind, "quota");
  assertEquals(rateLimit.severity, "informational");
  assert(rateLimit.unavailable?.reason.includes("150 requests per 5 seconds"));
  assertEquals(rateLimit.check, undefined);
});
