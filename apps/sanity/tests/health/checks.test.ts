import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import dataset from "../../health/dataset.ts";

const live = { display: { projectId: "abc123", dataset: "production", useCdn: false } };
const cdn = { display: { projectId: "abc123", dataset: "production", useCdn: true } };

const page = (over: Record<string, string> = {}) => ({
  components: [
    "Content Lake",
    "API CDN",
    "Asset pipeline",
    "Sanity Studio",
    "Manage dashboard",
  ].map((name) => ({ name, status: over[name] ?? "operational", group: false })),
});

Deno.test("service: all green reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page() }], live);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(new URL(calls[0].url).host, "www.sanity-status.com");
});

Deno.test("service: a Content Lake outage is down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: page({ "Content Lake": "major_outage" }) }], live);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

/** Studio and the dashboard are where humans work; no action touches them. */
Deno.test("service: a Studio outage is ignored", async () => {
  const { ctx } = mockCtx([{ status: 200, body: page({ "Sanity Studio": "major_outage" }) }], live);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.components!["sanity-studio"], undefined);
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }], live);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: renamed components report unknown rather than a false green", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { components: [{ name: "Something" }] } }], live);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/** The check that catches a wrong project id or a mistyped dataset. */
Deno.test("dataset: runs an empty query against the connection's own dataset", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [] } }], live);
  const out = await dataset.check!({}, ctx);
  assertEquals(out.state, "ok");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2025-02-19/data/query/production");
  assertEquals(url.searchParams.get("query"), "*[0...0]");
});

/**
 * The CDN serves cached content for up to two hours during an outage, so a
 * check that went through it would report green on stale data.
 */
Deno.test("dataset: always reads the live host, even on a CDN connection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [] } }], cdn);
  await dataset.check!({}, ctx);
  assertEquals(new URL(calls[0].url).host, "abc123.api.sanity.io");
});

Deno.test("dataset: a missing dataset is down, and named", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      statusCode: 404,
      error: "Dataset not found",
      message: 'Dataset "production" not found',
    },
  }], live);
  const out = await dataset.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(/dataset "production" does not exist/.test(out.message!), out.message);
});

Deno.test("dataset: a rejected token is left to the auth check", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }], live);
  assertEquals((await dataset.check!({}, ctx)).state, "unknown");
});

Deno.test("dataset: rate limiting is degraded, not down", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "" }], live);
  assertEquals((await dataset.check!({}, ctx)).state, "degraded");
});

Deno.test("dataset: a connection missing its project is down immediately", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  assertEquals((await dataset.check!({}, ctx)).state, "down");
  assertEquals(calls.length, 0);
});
