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

test("site: ok on a plain 200 from GET /", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { cluster_name: "my-cluster" } }], {
    display: { endpoint: "https://example.com:9200" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(calls[0].url, "https://example.com:9200/");
  assertEquals(calls[0].method, "GET");
});

test("site: 401 counts as reachable (security enabled, cluster IS up)", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }], {
    display: { endpoint: "https://example.com:9200" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "ok");
});

test("site: 403 also counts as reachable", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }], {
    display: { endpoint: "https://example.com:9200" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "ok");
});

test("site: down on 404 (not Elasticsearch-shaped)", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], {
    display: { endpoint: "https://example.com:9200" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "down");
});

test("site: down on 5xx", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }], {
    display: { endpoint: "https://example.com:9200" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "down");
});

test("site: trims a trailing slash from the endpoint before probing", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    display: { endpoint: "https://example.com:9200/" },
  });
  await site.check!({}, ctx);
  assertEquals(calls[0].url, "https://example.com:9200/");
});
