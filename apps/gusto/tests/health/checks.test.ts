import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import apiVersion from "../../health/api-version.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

const page = (over: Record<string, string> = {}) => ({
  components: [
    "API",
    "Payroll, Benefits, HR",
    "Database",
    "S3 West",
    "Cloudflare CDN/Cache",
    "Phone System",
    "Chat System",
    "Gusto.com website",
  ].map((name) => ({ name, status: over[name] ?? "operational", group: false })),
});

test("service: all green reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page() }], conn);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(new URL(calls[0].url).host, "status.gusto.com");
});

/** The support channels are not this app's path. */
test("service: a support-channel outage is ignored entirely", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: page({ "Phone System": "major_outage", "Chat System": "major_outage" }),
  }], conn);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.components!["phone-system"], undefined);
});

test("service: an API outage is down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: page({ API: "major_outage" }) }], conn);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

/** Gusto exposes its vendors by name; they are upstream, not authoritative. */
test("service: an infrastructure outage is capped at degraded", async () => {
  const { ctx } = mockCtx([{ status: 200, body: page({ "S3 West": "major_outage" }) }], conn);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assertEquals(out.components!["s3-west"].state, "degraded");
});

test("service: Cloudflare's components are treated as infrastructure too", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: page({ "Cloudflare CDN/Cache": "major_outage" }),
  }], conn);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }], conn);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

test("service: renamed components report unknown rather than a false green", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { components: [{ name: "Something" }] } }], conn);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/** Gusto answers the deprecation question itself, in a header nobody reads. */
test("api-version: no deprecation header means the pin is current", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {},
    headers: { "content-type": "application/json", "x-gusto-api-version": "2026-06-15" },
  }], conn);
  const out = await apiVersion.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].headers["x-gusto-api-version"], "2026-06-15");
});

test("api-version: a future sunset is degraded, with the days left", async () => {
  const future = Math.floor(Date.now() / 1000) + 30 * 86400;
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: {
      "content-type": "application/json",
      "x-gusto-api-version": "2026-06-15",
      deprecation: `@${future}`,
    },
  }], conn);
  const out = await apiVersion.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assert(/days left/.test(out.message!), out.message);
});

test("api-version: a sunset already past is down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: {
      "content-type": "application/json",
      "x-gusto-api-version": "2026-06-15",
      // The value Gusto returned for 2024-04-01, measured 2026-08-18.
      deprecation: "@1749945600",
    },
  }], conn);
  const out = await apiVersion.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(/sunset/.test(out.message!), out.message);
});

/** An unknown version is served as the newest, silently. */
test("api-version: being served a different version is down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: { "content-type": "application/json", "x-gusto-api-version": "2027-01-01" },
  }], conn);
  const out = await apiVersion.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(/no longer recognised/.test(out.message!), out.message);
});

test("api-version: a credential failure is left to the auth check", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }], conn);
  assertEquals((await apiVersion.check!({}, ctx)).state, "unknown");
});

test("api-version: is a connection-scoped dependency check", () => {
  assertEquals(apiVersion.kind, "dependency");
  assertEquals(apiVersion.scope, "connection");
  assertEquals(apiVersion.credential, "signed");
});
