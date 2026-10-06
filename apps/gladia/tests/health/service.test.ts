import { assertEquals } from "@std/assert";
import service, { PAGE_ID, STATUS_HOST } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = (statuses: Record<string, string>, over: Record<string, unknown> = {}) => ({
  page: { id: PAGE_ID, name: "Gladia" },
  status: { indicator: "none", description: "All Systems Operational" },
  components: Object.entries(statuses).map(([name, status]) => ({ name, status })),
  ...over,
});
const ALL_OK = {
  "Website": "operational",
  "Playground": "operational",
  "API": "operational",
  "Add-ons": "operational",
  "Pre-Recorded v2": "operational",
  "Real-Time v1": "operational",
  "Real-Time v2": "operational",
};

Deno.test("service: scoped to the status host, unsigned", () => {
  assertEquals(service.network, { allow: [STATUS_HOST] });
  assertEquals(service.credential, "none");
});

Deno.test("service: all operational is ok, with per-component detail", async () => {
  const { ctx, calls } = mockCtx([{ body: page(ALL_OK) }]);
  const res = await service.check!({}, ctx);
  assertEquals(res.state, "ok");
  assertEquals(calls[0].url, "https://status.gladia.io/api/v2/summary.json");
  assertEquals(res.components?.["pre-recorded-v2"]?.state, "ok");
});

Deno.test("service: an API or Pre-Recorded outage is down", async () => {
  for (const name of ["API", "Pre-Recorded v2"]) {
    const { ctx } = mockCtx([{ body: page({ ...ALL_OK, [name]: "major_outage" }) }]);
    assertEquals((await service.check!({}, ctx)).state, "down", name);
  }
  const partial = mockCtx([{ body: page({ ...ALL_OK, API: "partial_outage" }) }]).ctx;
  assertEquals((await service.check!({}, partial)).state, "degraded");
});

Deno.test("service: a Real-Time outage does not decide, and is capped at degraded", async () => {
  const { ctx } = mockCtx([{ body: page({ ...ALL_OK, "Real-Time v2": "major_outage" }) }]);
  const res = await service.check!({}, ctx);
  assertEquals(res.state, "ok");
  assertEquals(res.components?.["real-time-v2"]?.state, "degraded");
});

Deno.test("service: a page that is not Gladia's, or has no API component, is unknown", async () => {
  const other = mockCtx([{ body: page(ALL_OK, { page: { id: "x", name: "Other" } }) }]).ctx;
  assertEquals((await service.check!({}, other)).state, "unknown");
  const none = mockCtx([{ body: page({ Website: "operational" }) }]).ctx;
  assertEquals((await service.check!({}, none)).state, "unknown");
});

Deno.test("service: an unreachable or erroring status page is unknown, never down", async () => {
  assertEquals((await service.check!({}, mockCtx([{ status: 500 }]).ctx)).state, "unknown");
  assertEquals((await service.check!({}, mockCtx([]).ctx)).state, "unknown");
  assertEquals((await service.check!({}, mockCtx([{ body: "<html>" }]).ctx)).state, "unknown");
});
