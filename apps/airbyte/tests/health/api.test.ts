import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/api.ts";
import service from "../../health/service.ts";

const D = { display: { host: "https://api.airbyte.com" } };
const run = (ctx: Parameters<NonNullable<typeof check.check>>[1]) => check.check!({}, ctx);

/** Tokens last three minutes, so a signed check would report on the token. */
Deno.test("api: probes /v1/health with no credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "Successful operation" }], D);
  const result = await run(ctx);
  assertEquals(calls[0].url, "https://api.airbyte.com/v1/health");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(check.credential, "none");
  assertEquals(result.state, "ok");
  assert(/Successful operation/.test(result.message!), result.message);
});

/** The response is plain text; a JSON parse would fail on a healthy Airbyte. */
Deno.test("api: a plain-text body is a success, not a parse failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "OK" }], D);
  assertEquals((await run(ctx)).state, "ok");
});

Deno.test("api: HTML means a proxy answering for Airbyte", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>Sign in</html>" }], D);
  const result = await run(ctx);
  assertEquals(result.state, "degraded");
  assert(/proxy or a login page/.test(result.message!), result.message);
});

/** On a self-managed deployment a 404 is usually the path, not an outage. */
Deno.test("api: a 404 says the API may not be exposed there", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], {
    display: { host: "https://airbyte.internal" },
  });
  const result = await run(ctx);
  assertEquals(result.state, "degraded");
  assert(/not exposed at the path/.test(result.message!), result.message);
});

Deno.test("api: a 5xx is down and an unreachable host is down", async () => {
  const server = mockCtx([{ status: 503, body: "" }], D);
  assertEquals((await run(server.ctx)).state, "down");

  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
    connection: D,
  } as unknown as Parameters<NonNullable<typeof check.check>>[1];
  assertEquals((await run(ctx)).state, "down");
});

/** It probes whichever Airbyte the connection points at. */
Deno.test("api: a self-managed host is probed rather than the cloud", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "OK" }], {
    display: { host: "https://airbyte.internal" },
  });
  await run(ctx);
  assertEquals(calls[0].url, "https://airbyte.internal/v1/health");
});

/** Much of Airbyte is self-managed, so the Cloud feed cannot be fatal. */
Deno.test("service: reads Airbyte Cloud's feed and is only informational", async () => {
  assertEquals(service.severity, "informational");
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      status: { description: "All Systems Operational" },
      components: [{ name: "API", status: "operational" }],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.airbyte.com/api/v2/summary.json");
  assertEquals(result.state, "ok");
  assert(/says nothing about a self-managed deployment/.test(result.message!), result.message);
});

/** A stale pipeline is usually not an outage. */
Deno.test("service: an incident is degraded, and says what it is weak evidence for", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [{ name: "Sync", status: "partial_outage" }],
      incidents: [{ name: "Elevated sync failures" }],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/Elevated sync failures/.test(result.message!), result.message);
  assert(/more often a paused connection/.test(result.message!), result.message);
});

Deno.test("service: an unreadable feed is unknown", async () => {
  const down = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, down.ctx)).state, "unknown");
  const empty = mockCtx([{ status: 200, body: { components: [] } }]);
  assertEquals((await service.check!({}, empty.ctx)).state, "unknown");
});
