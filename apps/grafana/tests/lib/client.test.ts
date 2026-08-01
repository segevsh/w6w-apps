import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { GrafanaClient, resolveBaseUrl } from "../../lib/client.ts";

Deno.test("resolveBaseUrl: returns endpoint as-is", () => {
  assertEquals(
    resolveBaseUrl({ endpoint: "https://example.grafana.net" }),
    "https://example.grafana.net",
  );
});

Deno.test("resolveBaseUrl: trims trailing slash", () => {
  assertEquals(
    resolveBaseUrl({ endpoint: "https://example.grafana.net/" }),
    "https://example.grafana.net",
  );
});

Deno.test("resolveBaseUrl: throws when endpoint is missing", () => {
  assertThrows(() => resolveBaseUrl({}), Error, "missing endpoint");
});

Deno.test("client: prefixes every path with /api", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new GrafanaClient(ctx, "https://example.grafana.net");
  await client.request("/org");
  assertEquals(new URL(calls[0].url).pathname, "/api/org");
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new GrafanaClient(ctx, "https://example.grafana.net");
  const result = await client.request("/dashboards/uid/x");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"message":"dashboard not found"}' },
  ]);
  const client = new GrafanaClient(ctx, "https://example.grafana.net");
  const err = await assertRejects(
    () => client.request("/dashboards/uid/missing"),
    Error,
    "Grafana 404",
  );
  assert(err.message.includes("/api/dashboards/uid/missing"));
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const client = new GrafanaClient(ctx, "https://example.grafana.net");
  await client.request("/search", { query: { a: "kept", b: undefined, c: null, d: "" } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: JSON bodies set content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "1" } }]);
  const client = new GrafanaClient(ctx, "https://example.grafana.net");
  await client.request("/dashboards/db", { method: "POST", body: { dashboard: { title: "hi" } } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ dashboard: { title: "hi" } }));
});

Deno.test("client: fromConnection reads display.endpoint to build the base URL", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], {
    display: { endpoint: "https://example.grafana.net" },
  });
  const client = GrafanaClient.fromConnection(ctx);
  await client.request("/org");
  assertEquals(new URL(calls[0].url).origin, "https://example.grafana.net");
  assertEquals(new URL(calls[0].url).pathname, "/api/org");
});

Deno.test("client: empty response body does not throw on JSON parse", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "", headers: { "content-type": "text/plain" } }]);
  const client = new GrafanaClient(ctx, "https://example.grafana.net");
  const result = await client.request("/org");
  assertEquals(result, undefined);
});
