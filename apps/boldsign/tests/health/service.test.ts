import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const summaryWith = (
  components: Array<{ name: string; description: string | null; status: string }>,
) => ({
  status: { indicator: "none", description: "All Systems Operational" },
  components,
});

test("service: ok when this connection's region component is operational", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: summaryWith([
        { name: "API (Global)", description: "api.boldsign.com", status: "operational" },
        { name: "API (Europe)", description: "api-eu.boldsign.com", status: "major_outage" },
      ]),
    },
  ], { display: { apiHost: "api.boldsign.com" } });
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.api.state, "ok");
});

test("service: unaffected by another region's outage", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: summaryWith([
        { name: "API (Global)", description: "api.boldsign.com", status: "operational" },
        { name: "API (Europe)", description: "api-eu.boldsign.com", status: "major_outage" },
      ]),
    },
  ], { display: { apiHost: "api.boldsign.com" } });
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

test("service: reports THIS connection's region when it is the one degraded", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: summaryWith([
        { name: "API (Global)", description: "api.boldsign.com", status: "operational" },
        { name: "API (Europe)", description: "api-eu.boldsign.com", status: "partial_outage" },
      ]),
    },
  ], { display: { apiHost: "api-eu.boldsign.com" } });
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

test("service: falls back to the page rollup when no matching region component is found", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summaryWith([]) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

test("service: unknown, never down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("service: hits status.boldsign.com, unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: summaryWith([]) }]);
  await service.check!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "status.boldsign.com");
  assertEquals(calls[0].headers["x-api-key"], undefined);
});
