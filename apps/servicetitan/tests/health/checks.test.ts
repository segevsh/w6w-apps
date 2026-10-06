import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { CORE_GROUP_ID, PAGE_ID, STATUS_URL } from "../../health/service.ts";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";

const page = { id: PAGE_ID, name: "ServiceTitan", url: "https://status.servicetitan.com" };

function summary(core: string, other: string) {
  return {
    page,
    status: { indicator: "none" },
    components: [
      { id: "g", name: "Core Product Features", status: "operational", group: true },
      { id: "d", name: "Dispatch", status: core, group: false, group_id: CORE_GROUP_ID },
      { id: "a", name: "Accounting", status: "operational", group: false, group_id: CORE_GROUP_ID },
      { id: "s", name: "SMS", status: other, group: false, group_id: "other" },
    ],
  };
}

Deno.test("service: all operational is ok and calls the status summary only", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: summary("operational", "operational") }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(service.credential, "none");
});

Deno.test("service: a degraded core component degrades the verdict and is named", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary("degraded_performance", "operational") }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("Dispatch"), report.message);
});

Deno.test("service: a non-core outage (SMS) is detail, not the verdict", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary("operational", "major_outage") }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components!["s"].state, "down");
  assert(report.message!.includes("non-core"));
});

Deno.test("service: a core major outage is down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary("major_outage", "operational") }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: a page with another id, a 5xx, or no core group is unknown — never down", async () => {
  const other = summary("operational", "operational");
  other.page = { ...page, id: "zzz" };
  assertEquals(
    (await service.check!({}, mockCtx([{ status: 200, body: other }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({}, mockCtx([{ status: 503, body: {} }]).ctx)).state,
    "unknown",
  );
  const noCore = summary("operational", "operational");
  noCore.components = noCore.components.map((c) => ({ ...c, group_id: "other" }));
  assertEquals(
    (await service.check!({}, mockCtx([{ status: 200, body: noCore }]).ctx)).state,
    "unknown",
  );
});

const problem = { type: "t", title: "Application key not present", status: 401, traceId: "x" };

Deno.test("api: a schema-correct unsigned 401 is a pass, against the production host", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: problem }], {
    display: { tenantId: "42", environment: "production" },
  });
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(calls[0].url.startsWith("https://api.servicetitan.io/"));
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(api.credential, "context");
});

Deno.test("api: the integration connection probes the integration host", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: problem }], {
    display: { tenantId: "42", environment: "integration" },
  });
  await api.check!({}, ctx);
  assert(calls[0].url.startsWith("https://api-integration.servicetitan.io/"));
});

Deno.test("api: 5xx is down, a redirect is down, an HTML 200 is unknown", async () => {
  const conn = { display: { tenantId: "42" } };
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 502, body: "bad" }], conn).ctx)).state,
    "down",
  );
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 302, body: "" }], conn).ctx)).state,
    "down",
  );
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 200, body: "<html></html>" }], conn).ctx)).state,
    "unknown",
  );
});

Deno.test("quota: declared unavailable at informational severity", () => {
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.length > 0);
  assertEquals(quota.check, undefined);
});
