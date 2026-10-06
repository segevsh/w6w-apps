import { assert, assertEquals } from "@std/assert";
import service, { mapComponentStatus, PAGE_ID, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(authStatus = "operational", billing = "operational", pageId = PAGE_ID) {
  return {
    page: { id: pageId, name: "Mural", url: "https://status.mural.co" },
    components: [
      { id: "80j005qsrmjz", name: "Authentication", status: authStatus, group: false },
      { id: "mkmjnq1rb559", name: "Mural Application", status: "operational", group: true },
      { id: "42zc4v22b21z", name: "Canvas", status: "operational", group: false },
      { id: "20lgmjb54nmc", name: "Billing", status: billing, group: false },
    ],
  };
}

Deno.test("service: probes the status host with no credential", () => {
  assertEquals(STATUS_URL, "https://status.mural.co/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.mural.co"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: covered components operational reports ok; groups and Billing are not listed", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}).sort(), ["42zc4v22b21z", "80j005qsrmjz"]);
});

Deno.test("service: an outage on Billing does not move the verdict", async () => {
  const { ctx } = mockCtx([{ body: summary("operational", "major_outage") }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: a covered component outage is reported by name", async () => {
  const { ctx } = mockCtx([{ body: summary("major_outage") }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "down");
  assert(r.message!.includes("Authentication"));
});

Deno.test("service: a page that is not Mural's is unknown, never ok", async () => {
  const { ctx } = mockCtx([{ body: summary("operational", "operational", "other") }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a failing status feed is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "x" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("mapComponentStatus: Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("weird"), "unknown");
});
