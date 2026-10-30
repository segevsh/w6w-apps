import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service, { mapSorryState } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

test("mapSorryState: the one confirmed-live value maps to ok", () => {
  assertEquals(mapSorryState("operational"), "ok");
});

test("mapSorryState: anything else is degraded, not down — vocabulary isn't documented", () => {
  assertEquals(mapSorryState("downtime"), "degraded");
  assertEquals(mapSorryState("maintenance"), "degraded");
});

test("mapSorryState: absence is unknown", () => {
  assertEquals(mapSorryState(undefined), "unknown");
});

test("service: reports ok when the page and the API component are both operational", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        page: {
          id: 2543,
          name: "MeisterTask",
          state: "operational",
          url: "https://status.meistertask.com",
        },
      },
    },
    {
      status: 200,
      body: { components: [{ id: 1791, name: "API", state: "operational" }] },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

test("service: a degraded API component outranks a green page-level roll-up", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: { page: { state: "operational", url: "https://status.meistertask.com" } },
    },
    {
      status: 200,
      body: { components: [{ id: 1791, name: "API", state: "downtime" }] },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("API component"), true);
});

test("service: a broken status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("service: a page no longer self-identifying as MeisterTask's reports unknown", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { page: { state: "operational", url: "https://status.example.com" } } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
