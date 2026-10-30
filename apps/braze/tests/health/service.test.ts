import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

function summaryFixture() {
  return {
    components: [
      { id: "us01group", name: "US 01 Cluster", group: true },
      { id: "us01rest", name: "REST APIs", group_id: "us01group", status: "operational" },
      { id: "us01dash", name: "Dashboard", group_id: "us01group", status: "operational" },
      { id: "eu01group", name: "EU 01 Cluster", group: true },
      { id: "eu01rest", name: "REST APIs", group_id: "eu01group", status: "major_outage" },
    ],
  };
}

test("service: reports ok when this connection's cluster's REST APIs component is operational", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summaryFixture() }], {
    display: { instance: "iad-01" },
  });
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["REST APIs"].state, "ok");
});

test("service: an outage on a DIFFERENT cluster does not affect this connection", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summaryFixture() }], {
    display: { instance: "iad-01" },
  });
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

test("service: reports down for a connection on the cluster that IS down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summaryFixture() }], {
    display: { instance: "fra-01" },
  });
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

test("service: reports unknown, not down, when the status page itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }], { display: { instance: "iad-01" } });
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("service: reports unknown when the status page names no such cluster", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { components: [] } }], {
    display: { instance: "iad-01" },
  });
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
