import { assertEquals } from "@std/assert";
import service, { findApiComponent, mapComponentStatus } from "../health/service.ts";
import { mockCtx } from "./_helpers.ts";

const page = { id: "0pphh991mx84", name: "Loyverse" };
const comps = (apiStatus: string) => [
  { id: "cxj7rxtrzhtb", name: "Loyverse POS", status: "operational" },
  { id: "qxrrr61qq9pr", name: "Loyverse API", status: apiStatus },
];
const run = (responses: Parameters<typeof mockCtx>[0]) =>
  service.check!({} as never, mockCtx(responses).ctx);

Deno.test("service: operational API component is ok", async () => {
  const r = await run([{ body: { page, components: comps("operational"), incidents: [] } }]);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}).length, 2);
});

Deno.test("service: API outage is down; other-component trouble never drives the verdict", async () => {
  assertEquals((await run([{ body: { page, components: comps("major_outage") } }])).state, "down");
  const other = [
    { id: "cxj7rxtrzhtb", name: "Loyverse POS", status: "major_outage" },
    { id: "qxrrr61qq9pr", name: "Loyverse API", status: "operational" },
  ];
  const r = await run([{ body: { page, components: other } }]);
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

Deno.test("service: status mapping and name fallback", () => {
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("nonsense"), "unknown");
  assertEquals(findApiComponent([{ id: "new", name: "loyverse api" }])?.id, "new");
});
