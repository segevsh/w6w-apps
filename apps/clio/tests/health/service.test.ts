import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service, { mapIndicator, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

test("service: STATUS_URL is the incident.io-hosted status.clio.com summary", () => {
  assertEquals(STATUS_URL, "https://status.clio.com/api/v2/summary.json");
});

test("mapIndicator: the documented Statuspage-v2-compatible vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "down");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
  assertEquals(mapIndicator("something-new"), "unknown");
});

test("service: ok with no message when the indicator is none and nothing else is open", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "Clio Status Pages", url: "https://status.clio.com/" },
      status: { indicator: "none", description: "All Systems Operational" },
      incidents: [],
      scheduled_maintenances: [],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(result.message, "All Systems Operational");
});

test("service: an open incident is named in the message", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { url: "https://status.clio.com/" },
      status: { indicator: "minor" },
      incidents: [{ name: "Performance issues", status: "investigating" }],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(result.message?.includes("Performance issues"), result.message);
});

test("service: a resolved incident does not count as open", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { url: "https://status.clio.com/" },
      status: { indicator: "none" },
      incidents: [{ name: "Old outage", status: "resolved" }],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assert(!result.message?.includes("Old outage"), result.message);
});

test("service: unknown, never down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

test("service: unknown when the body is not JSON", async () => {
  const { ctx } = mockCtx([{ body: "not json", headers: { "content-type": "text/plain" } }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

test("service: unknown when the page no longer self-identifies as Clio's", async () => {
  const { ctx } = mockCtx([{
    body: { page: { url: "https://status.example.com/" }, status: { indicator: "none" } },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

test("service: declares credential none and its own status-host allowlist", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.clio.com"]);
  assertEquals(service.kind, "service");
});
