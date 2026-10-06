import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { GROUP_NAME } from "../../health/service.ts";

function fixture(
  overrides: Record<string, string> = {},
) {
  const components: Array<Record<string, unknown>> = [];
  let n = 0;
  for (const [region, name] of Object.entries(GROUP_NAME)) {
    const gid = `g${n++}`;
    components.push({ id: gid, name, group: true, status: "operational" });
    components.push({
      id: `${gid}-cma`,
      name: "Content Management API",
      group: false,
      group_id: gid,
      status: overrides[region] ?? "operational",
    });
    components.push({
      id: `${gid}-cda`,
      name: "Content Delivery API",
      group: false,
      group_id: gid,
      status: "major_outage",
    });
  }
  return { page: { name: "Contentstack" }, components };
}

const withRegion = (region: string) => ({ connection: { display: { region } } });

Deno.test("service: declared as a per-connection, context-posture service check on the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "connection");
  assertEquals(service.credential, "context");
  assertEquals(service.network?.allow, ["status.contentstack.com"]);
});

Deno.test("service: ok when this region's Content Management API is operational", async () => {
  const { ctx, calls } = mockCtx([{ body: fixture() }], withRegion("eu"));
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://status.contentstack.com/api/v2/summary.json");
  assertEquals(report.components?.["Content Management API"].state, "ok");
});

Deno.test("service: another product's outage in the same region does not matter", async () => {
  // The fixture marks Content Delivery API as a major outage everywhere.
  const { ctx } = mockCtx([{ body: fixture() }], withRegion("na"));
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: an outage in a different region does not affect this connection", async () => {
  const { ctx } = mockCtx([{ body: fixture({ eu: "major_outage" }) }], withRegion("na"));
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: maps each region to its own group and reports the outage there", async () => {
  for (const region of Object.keys(GROUP_NAME)) {
    const { ctx } = mockCtx([{ body: fixture({ [region]: "major_outage" }) }], withRegion(region));
    assertEquals((await service.check!({}, ctx)).state, "down", region);
  }
});

Deno.test("service: partial outage and maintenance degrade", async () => {
  for (const status of ["partial_outage", "degraded_performance", "under_maintenance"]) {
    const { ctx } = mockCtx([{ body: fixture({ na: status }) }], withRegion("na"));
    assertEquals((await service.check!({}, ctx)).state, "degraded", status);
  }
});

Deno.test("service: unknown, not down, when the status page fails or is not Contentstack's", async () => {
  const failing = mockCtx([{ status: 500 }], withRegion("na"));
  assertEquals((await service.check!({}, failing.ctx)).state, "unknown");
  const wrongPage = mockCtx([{ body: { page: { name: "Other" }, components: [] } }]);
  assertEquals((await service.check!({}, wrongPage.ctx)).state, "unknown");
  const noGroup = mockCtx([{ body: { page: { name: "Contentstack" }, components: [] } }]);
  assertEquals((await service.check!({}, noGroup.ctx)).state, "unknown");
});

Deno.test("service: unknown when the region group has no Content Management API child", async () => {
  const body = fixture();
  body.components = body.components.filter((c) => c.name !== "Content Management API");
  const { ctx } = mockCtx([{ body }], withRegion("na"));
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
