import { assertEquals } from "@std/assert";
import service, { findApiComponent, mapComponentStatus } from "../health/service.ts";
import quota from "../health/quota.ts";
import { mockCtx } from "./_helpers.ts";

const page = { id: "3thm1ndd6lgx", name: "Dixa" };
const comps = (apiStatus: string, otherStatus = "operational") => [
  { id: "wnkcfd91pshc", name: "Agent Interface", status: otherStatus },
  { id: "k3z0jwsfc3y3", name: "Dixa API and Exports API", status: apiStatus },
  { id: "rry5vm1gjfpx", name: "Integrations", status: "operational", group: true },
];
const run = (responses: Parameters<typeof mockCtx>[0]) =>
  service.check!({} as never, mockCtx(responses).ctx);

Deno.test("service: operational API component is ok and the group row is skipped", async () => {
  const r = await run([{ body: { page, components: comps("operational") } }]);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}).length, 2);
});

Deno.test("service: API outage is down; other-component trouble never drives the verdict", async () => {
  assertEquals((await run([{ body: { page, components: comps("major_outage") } }])).state, "down");
  assertEquals(
    (await run([{ body: { page, components: comps("partial_outage") } }])).state,
    "degraded",
  );
  const r = await run([{ body: { page, components: comps("operational", "major_outage") } }]);
  assertEquals(r.state, "ok");
  assertEquals(r.message?.includes("affected"), true);
});

Deno.test("service: wrong page, missing component or HTTP failure is unknown, never down", async () => {
  assertEquals(
    (await run([{ body: { page: { id: "zzz" }, components: comps("operational") } }])).state,
    "unknown",
  );
  assertEquals(
    (await run([{
      body: { page, components: [{ id: "x", name: "Other", status: "operational" }] },
    }])).state,
    "unknown",
  );
  assertEquals((await run([{ status: 503, body: "x" }])).state, "unknown");
  assertEquals((await run([{ body: "<html>" }])).state, "unknown");
  assertEquals((await run([{ body: { page, components: [] } }])).state, "unknown");
});

Deno.test("service: fetches only the declared status URL, declared per check", async () => {
  const m = mockCtx([{ body: { page, components: comps("operational") } }]);
  await service.check!({} as never, m.ctx);
  assertEquals(m.calls[0].url, "https://status.dixa.io/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.dixa.io"]);
});

Deno.test("service: status mapping and name fallback", () => {
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("nonsense"), "unknown");
  assertEquals(findApiComponent([{ id: "new", name: "dixa api and exports api" }])?.id, "new");
});

Deno.test("quota: is a declared absence with informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.check, undefined);
});
