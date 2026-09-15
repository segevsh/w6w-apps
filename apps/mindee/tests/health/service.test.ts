import { assert, assertEquals } from "@std/assert";
import service, {
  API_V2_COMPONENT_ID,
  mapComponentStatus,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-09-15. */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "4twbvfmnmm9c", name: "Mindee", url: "https://status.mindee.com" },
    components: [
      { id: "lmt9r82tm0k9", name: "API V1 (api.mindee.net)", status: "operational", group: false },
      {
        id: "n5xr39jcry16",
        name: "Platform V1 (platform.mindee.net)",
        status: "operational",
        group: false,
      },
      {
        id: "7hyjmkw09n77",
        name: "API V2 (api-v2.mindee.net)",
        status: "operational",
        group: false,
      },
      { id: "kbw9mshpfd64", name: "Website", status: "operational", group: false },
      {
        id: "ygd7tnqqjzpk",
        name: "Platform V2 (app.mindee.com)",
        status: "operational",
        group: false,
      },
      { id: "gstvgcwgmtd2", name: "Mindee V1", status: "operational", group: true },
      { id: "860jtq3b8wnc", name: "Mindee V2", status: "operational", group: true },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: probes the status host, not the API host", () => {
  assertEquals(STATUS_URL, "https://status.mindee.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.mindee.com"]);
  assertEquals(service.credential, "none");
  assertEquals(API_V2_COMPONENT_ID, "7hyjmkw09n77");
});

Deno.test("service: an operational API V2 component reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["7hyjmkw09n77"]?.state, "ok");
});

/**
 * The failure this guards: an incident against a DIFFERENT product on the
 * same shared page (legacy V1, or the app.mindee.com Platform UI) must not
 * report THIS app degraded.
 */
Deno.test("service: an outage on an unrelated component does not affect the verdict", async () => {
  const body = summary();
  (body.components[0] as { status: string }).status = "major_outage"; // API V1, not V2
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
});

Deno.test("service: an outage on the API V2 component itself is reported", async () => {
  const body = summary();
  const v2 = body.components.find((c) => c.id === "7hyjmkw09n77")!;
  (v2 as { status: string }).status = "major_outage";
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "down");
  assert(/API V2 \(api-v2\.mindee\.net\): major_outage/.test(report.message ?? ""), report.message);
});

Deno.test("service: a degraded API V2 component reports degraded", async () => {
  const body = summary();
  const v2 = body.components.find((c) => c.id === "7hyjmkw09n77")!;
  (v2 as { status: string }).status = "partial_outage";
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page that stops naming the API V2 component reports unknown", async () => {
  const body = summary({
    components: [{ id: "x", name: "Something Else", status: "operational" }],
  });
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/no longer lists the API V2 component/.test(report.message ?? ""), report.message);
});

/** A healthy, claimed page belonging to an entirely different product after a rebrand. */
Deno.test("service: a page that stops self-identifying as Mindee's reports unknown", async () => {
  const body = summary({
    page: { id: "x", name: "Somebody Else", url: "https://status.other.com" },
  });
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: open incidents/maintenance are noted but do not change the verdict alone", async () => {
  const body = summary({ incidents: [{ name: "Elevated errors", status: "investigating" }] });
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assert(/1 open incident\(s\) page-wide/.test(report.message ?? ""), report.message);
});

Deno.test("mapComponentStatus: Statuspage's vocabulary maps to the four health states", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something-new"), "unknown");
  assertEquals(mapComponentStatus(undefined), "unknown");
});
