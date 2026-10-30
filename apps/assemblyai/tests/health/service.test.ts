import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const SUMMARY = {
  page: { name: "AssemblyAI" },
  status: { indicator: "none", description: "All Systems Operational" },
  components: [
    { name: "APIs", status: "operational", group: true },
    { name: "Asynchronous API", status: "operational" },
    { name: "Transcription Queue", status: "operational" },
  ],
};

test("service: check() reports ok and skips the group header component", async () => {
  const { ctx } = mockCtx([{ status: 200, body: SUMMARY }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components ?? {}), ["asynchronous-api", "transcription-queue"]);
});

test("service: check() maps a degraded indicator", async () => {
  const degraded = { ...SUMMARY, status: { indicator: "minor", description: "Partial outage" } };
  const { ctx } = mockCtx([{ status: 200, body: degraded }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assertEquals(out.message, "Partial outage");
});

test("service: check() maps a major indicator to down", async () => {
  const down = { ...SUMMARY, status: { indicator: "major", description: "Major outage" } };
  const { ctx } = mockCtx([{ status: 200, body: down }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
});

test("service: check() reports unknown, never down, on a broken status page", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

test("service: check() reports unknown when the fetch itself throws", async () => {
  const ctx = {
    fetch: () => {
      throw new Error("network down");
    },
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof service.check>>[1];
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

test("service: check() reports unknown on a body with no status field", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { page: { name: "AssemblyAI" } } }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

test("service: declares its own status host allowlist, unsigned and app-scoped", () => {
  assertEquals(service.network?.allow, ["status.assemblyai.com"]);
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
});
