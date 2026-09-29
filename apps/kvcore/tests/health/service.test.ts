import { assert, assertEquals } from "@std/assert";
import service, { API_COMPONENT_ID, API_COMPONENT_NAME, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-09-29 (6,686 bytes, 18 components, one group). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: {
      id: "0lr4r0md6mgp",
      name: "Inside Real Estate",
      url: "https://status.insiderealestate.com",
    },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "b8t0686tftk6", name: "BoldTrail CRM", status: "operational", group: false },
      { id: "zzs42qmx6cl9", name: "kvCORE CRM", status: "operational", group: false },
      { id: API_COMPONENT_ID, name: API_COMPONENT_NAME, status: "operational", group: false },
      { id: "3650kmdjzjsg", name: "Back Office", status: "operational", group: true },
    ],
    incidents: [],
    ...overrides,
  };
}

Deno.test("service: probes the status host, not the API host", () => {
  assertEquals(STATUS_URL, "https://status.insiderealestate.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.insiderealestate.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an operational kvCORE API component reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.[API_COMPONENT_ID]?.state, "ok");
});

/** An unrelated product component going down must not affect this check. */
Deno.test("service: an outage in a different product component does not report down", async () => {
  const body = summary();
  body.components[1].status = "major_outage"; // "kvCORE CRM", not the API component
  const { ctx } = mockCtx([{ body }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: an outage in the kvCORE API component itself reports down", async () => {
  const body = summary();
  const api = body.components.find((c) => c.id === API_COMPONENT_ID)!;
  api.status = "major_outage";
  const { ctx } = mockCtx([{ body }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(/kvCORE API: major_outage/.test(report.message ?? ""), report.message);
});

Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page that stops self-identifying as Inside Real Estate's reports unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ page: { name: "Somebody Else" } }) }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: a page that drops the kvCORE API component reports unknown", async () => {
  const body = summary();
  body.components = body.components.filter((c) => c.id !== API_COMPONENT_ID);
  const { ctx } = mockCtx([{ body }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/no longer lists/.test(report.message ?? ""), report.message);
});
