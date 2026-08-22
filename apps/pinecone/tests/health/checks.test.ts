import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import indexes from "../../health/indexes.ts";
import quota from "../../health/quota.ts";

const page = (over: Record<string, string> = {}) => ({
  components: [
    "Index Management",
    "Inference",
    "Console",
    "AWS us-east-1",
    "GCP europe-west4",
    "Azure eastus2",
  ].map((name) => ({ name, status: over[name] ?? "operational", group: false })),
});

Deno.test("service: all green reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page() }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(new URL(calls[0].url).host, "status.pinecone.io");
});

/** A global outage breaks every call this app makes. */
Deno.test("service: a global component outage is down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: page({ "Index Management": "major_outage" }) }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

/**
 * A region outage might not affect this connection at all — this check is
 * app-scoped and cannot know where the index lives.
 */
Deno.test("service: a single region outage is capped at degraded", async () => {
  const { ctx } = mockCtx([{ status: 200, body: page({ "AWS us-east-1": "major_outage" }) }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assertEquals(out.components!["aws-us-east-1"].state, "degraded");
  assertEquals(out.components!["index-management"].state, "ok");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: renamed global components report unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { components: [{ name: "Something else" }] } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("indexes: every index Ready reports ok", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      indexes: [
        {
          name: "a",
          status: { ready: true, state: "Ready" },
          spec: { serverless: { cloud: "aws", region: "us-east-1" } },
        },
      ],
    },
  }]);
  const out = await indexes.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].headers["x-pinecone-api-version"], "2026-04");
  assertEquals(out.components!["a"].message, "Ready (aws/us-east-1)");
});

/** Initializing answers control-plane calls and rejects data-plane ones. */
Deno.test("indexes: an initializing index is degraded, a failed one is down", async () => {
  const initializing = mockCtx([{
    status: 200,
    body: { indexes: [{ name: "a", status: { ready: false, state: "Initializing" } }] },
  }]);
  assertEquals((await indexes.check!({}, initializing.ctx)).state, "degraded");

  const failed = mockCtx([{
    status: 200,
    body: { indexes: [{ name: "a", status: { ready: false, state: "InitializationFailed" } }] },
  }]);
  const out = await indexes.check!({}, failed.ctx);
  assertEquals(out.state, "down");
  assert(out.message!.includes("InitializationFailed"), out.message);
});

Deno.test("indexes: an empty project is a fact, not a fault", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { indexes: [] } }]);
  const out = await indexes.check!({}, ctx);
  assertEquals(out.state, "ok");
  assert(/no indexes/.test(out.message!), out.message);
});

Deno.test("indexes: an unrecognised state falls back to the ready flag", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { indexes: [{ name: "a", status: { ready: true, state: "SomethingNew" } }] },
  }]);
  assertEquals((await indexes.check!({}, ctx)).state, "ok");
});

Deno.test("indexes: an API failure is unknown, and leaves auth to the auth check", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Invalid API key" }]);
  assertEquals((await indexes.check!({}, ctx)).state, "unknown");
});

/** Pinecone publishes no headers and no usage endpoint on this API. */
Deno.test("quota: is a declared absence with a reason, not a missing check", () => {
  assert(quota.unavailable, "quota should be declared unavailable");
  assert(quota.check === undefined, "quota should have no probe");
  assertEquals(quota.severity, "informational");
  assert(/x-ratelimit/i.test(quota.unavailable!.reason), quota.unavailable!.reason);
});
