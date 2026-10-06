import { assertEquals } from "@std/assert";
import service, { COMPONENTS_URL, mapComponentStatus, SUMMARY_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = { page: { name: "Mixmax", url: "https://status.mixmax.com", status: "UP" } };
const tree = (apiStatus: string, other = "OPERATIONAL") => ({
  components: [
    {
      id: "p1",
      name: "Developer Features",
      status: "OPERATIONAL",
      children: [{ id: "c1", name: "Public API", status: apiStatus, children: [] }],
    },
    { id: "c2", name: "API", status: "OPERATIONAL", children: [] },
    { id: "c3", name: "Sidebar", status: other, children: [] },
  ],
});

Deno.test("service: probes the status host only", () => {
  assertEquals(SUMMARY_URL, "https://status.mixmax.com/summary.json");
  assertEquals(COMPONENTS_URL, "https://status.mixmax.com/components.json");
  assertEquals(service.network?.allow, ["status.mixmax.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: healthy API components report ok, ignoring other components", async () => {
  const { ctx, calls } = mockCtx([{ body: page }, { body: tree("OPERATIONAL", "MAJOROUTAGE") }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls.map((c) => c.url), [SUMMARY_URL, COMPONENTS_URL]);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}).sort(), ["c1", "c2"]);
});

Deno.test("service: a nested Public API outage reports down", async () => {
  const { ctx } = mockCtx([{ body: page }, { body: tree("MAJOROUTAGE") }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "down");
  assertEquals(r.components?.c1.state, "down");
});

Deno.test("service: partial outage is degraded", async () => {
  const { ctx } = mockCtx([{ body: page }, { body: tree("PARTIALOUTAGE") }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: bad feeds, a foreign page and a missing component report unknown", async () => {
  assertEquals(
    (await service.check!({}, mockCtx([{ status: 503, body: "" }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({}, mockCtx([{ body: { page: { name: "Zite" } } }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({}, mockCtx([{ body: page }, { status: 500, body: "" }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({}, mockCtx([{ body: page }, { body: { components: [] } }]).ctx)).state,
    "unknown",
  );
});

Deno.test("service: component status mapping", () => {
  assertEquals(mapComponentStatus("OPERATIONAL"), "ok");
  assertEquals(mapComponentStatus("UNDERMAINTENANCE"), "degraded");
  assertEquals(mapComponentStatus("???"), "unknown");
});
