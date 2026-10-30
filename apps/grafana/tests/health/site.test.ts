import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import site from "../../health/site.ts";

test("site: dependency / connection / context posture", () => {
  assertEquals(site.kind, "dependency");
  assertEquals(site.scope, "connection");
  assertEquals(site.credential, "context");
});

test("site: unknown when the connection records no endpoint", async () => {
  const { ctx, calls } = mockCtx();
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assertEquals(calls.length, 0);
});

test("site: ok on a healthy 200 with database: ok", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { commit: "abc123", database: "ok", version: "11.0.0" } }],
    { display: { endpoint: "https://example.grafana.net" } },
  );
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(calls[0].url, "https://example.grafana.net/api/health");
  assertEquals(calls[0].method, "GET");
});

test("site: degraded when database is not ok", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { commit: "abc123", database: "failing", version: "11.0.0" } }],
    { display: { endpoint: "https://example.grafana.net" } },
  );
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "degraded");
});

test("site: down on 404 (not Grafana-shaped)", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], {
    display: { endpoint: "https://example.grafana.net" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "down");
});

test("site: down on 5xx", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }], {
    display: { endpoint: "https://example.grafana.net" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "down");
});

test("site: trims a trailing slash from the endpoint before probing", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { database: "ok" } }], {
    display: { endpoint: "https://example.grafana.net/" },
  });
  await site.check!({}, ctx);
  assertEquals(calls[0].url, "https://example.grafana.net/api/health");
});
