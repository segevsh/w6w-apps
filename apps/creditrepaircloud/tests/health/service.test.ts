import { assert, assertEquals } from "@std/assert";
import service, { STATUS_URL } from "../../health/service.ts";
import { mockCtx, type MockResponse } from "../_helpers.ts";

/** The five components the live page named on 2026-09-22. */
interface FixtureComponent {
  id?: string;
  name: string;
  status: string;
  description?: string;
}

const COMPONENTS: FixtureComponent[] = [
  { id: "c-crc", name: "CreditRepairCloud", status: "operational" },
  { id: "c-sca", name: "SecureClientAccess", status: "operational" },
  { id: "c-api", name: "API", status: "operational", description: "Backend API Service" },
  { id: "c-billing", name: "Billing API", status: "operational" },
  { id: "c-signup", name: "Signup", status: "operational" },
];

function summary(
  overrides: Partial<Record<"page" | "components" | "status" | "incidents", unknown>> = {},
): Record<string, unknown> {
  return {
    page: { id: "v53pwns8kml6", name: "CRC", url: "https://status.creditrepaircloud.com" },
    components: COMPONENTS,
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator: "none", description: "All Systems Operational" },
    ...overrides,
  };
}

async function run(responses: MockResponse[]) {
  const { ctx, calls } = mockCtx(responses);
  const report = await service.check!({}, ctx);
  return { report, calls };
}

Deno.test("service: probes the vendor's own summary.json, unauthenticated", async () => {
  const { calls } = await run([{ body: summary() }]);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers.accept, "application/json");
});

Deno.test("service: the API component's own state is the verdict", async () => {
  const { report } = await run([{
    body: summary({
      // A bad day on the end-user CRM must not report this app's API degraded.
      components: COMPONENTS.map((c) =>
        c.name === "CreditRepairCloud" ? { ...c, status: "major_outage" } : c
      ),
      status: { indicator: "critical", description: "Partial System Outage" },
    }),
  }]);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["c-api"], { state: "ok", message: "API" });
  assertEquals(report.components?.["c-crc"], {
    state: "down",
    message: "CreditRepairCloud: major_outage",
  });
});

Deno.test("service: a degraded API component reports degraded", async () => {
  const { report } = await run([{
    body: summary({
      components: COMPONENTS.map((c) =>
        c.name === "API" ? { ...c, status: "degraded_performance" } : c
      ),
    }),
  }]);
  assertEquals(report.state, "degraded");
});

Deno.test("service: a major API outage reports down", async () => {
  const { report } = await run([{
    body: summary({
      components: COMPONENTS.map((c) => c.name === "API" ? { ...c, status: "major_outage" } : c),
    }),
  }]);
  assertEquals(report.state, "down");
});

Deno.test("service: the message names the other four components", async () => {
  const { report } = await run([{ body: summary() }]);
  for (const name of ["CreditRepairCloud", "SecureClientAccess", "Billing API", "Signup"]) {
    assert(report.message?.includes(name), `${name} missing from: ${report.message}`);
  }
  assert(report.message?.includes("other components"), report.message);
});

Deno.test("service: a missing API component falls back to the page indicator", async () => {
  const { report } = await run([{
    body: summary({
      components: COMPONENTS.filter((c) => c.name !== "API"),
      status: { indicator: "minor", description: "Partially Degraded Service" },
    }),
  }]);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("not found in status feed"), report.message);
  assert(report.message?.includes("falling back"), report.message);
});

Deno.test("service: components without ids still report, slug-keyed", async () => {
  const { report } = await run([{
    body: summary({
      components: [{ name: "API", status: "operational" }, {
        name: "Signup",
        status: "operational",
      }],
    }),
  }]);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}), ["api-0", "signup-1"]);
});

Deno.test("service: an unreadable body is unknown, never down", async () => {
  const { report } = await run([{ status: 200, body: "<html>maintenance</html>" }]);
  assertEquals(report.state, "unknown");
  assertEquals(report.message, "Status page returned an unreadable body");
});

Deno.test("service: a failing status API is unknown, never down", async () => {
  const { report } = await run([{ status: 503, body: "" }]);
  assertEquals(report.state, "unknown");
  assertEquals(report.message, "Status page returned 503");
});

Deno.test("service: an empty component list is unknown", async () => {
  const { report } = await run([{ body: summary({ components: [] }) }]);
  assertEquals(report.state, "unknown");
  assertEquals(report.message, "Status page returned no components");
});

Deno.test("service: a page that no longer self-identifies as CRC's is unknown", async () => {
  const { report } = await run([{
    body: summary({ page: { id: "x", name: "Someone Else", url: "https://status.other.com" } }),
  }]);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("no longer self-identifies"), report.message);
});

Deno.test("service: the report is cached briefly and hides nothing about the API", async () => {
  const { report } = await run([{ body: summary() }]);
  assertEquals(report.ttlSeconds, 60);
  assertEquals(report.state, "ok");
  assertEquals(service.severity, undefined, "severity stays at the degraded default");
  assertEquals(service.network?.allow, ["status.creditrepaircloud.com"]);
  assertEquals(service.credential, "none");
});
