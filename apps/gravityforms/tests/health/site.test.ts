import { assert, assertEquals } from "@std/assert";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import site from "../../health/site.ts";

const discovery = (namespaces?: unknown) => ({
  name: "Example",
  ...(namespaces === undefined ? {} : { namespaces }),
});

Deno.test("site: is an unsigned, per-connection dependency check", () => {
  assertEquals(site.kind, "dependency");
  assertEquals(site.scope, "connection");
  assertEquals(site.credential, "context");
  // A `context` check must not widen egress — the app's own allowlist covers it.
  assertEquals(site.network, undefined);
  assert(site.check);
});

Deno.test("site: probes the unauthenticated /wp-json/ discovery document", async () => {
  const { ctx, calls } = mockCtx([{ body: discovery(["wp/v2", "gf/v2"]) }], { display: DISPLAY });
  const report = await site.check!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://example.com/wp-json/");
  assertEquals(Object.keys(calls[0].headers).includes("authorization"), false);
  assertEquals(report.state, "ok");
});

Deno.test("site: honours a subdirectory install", async () => {
  const { ctx, calls } = mockCtx([{ body: discovery(["gf/v2"]) }], {
    display: { siteUrl: "https://site.com/blog/" },
  });
  await site.check!({}, ctx);
  assertEquals(calls[0].url, "https://site.com/blog/wp-json/");
});

Deno.test("site: reports unknown, without a call, when no site URL is recorded", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  const report = await site.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(calls.length, 0);
});

Deno.test("site: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }], { display: DISPLAY });
  const report = await site.check!({}, ctx);
  assertEquals(report.state, "down");
  assert((report.message ?? "").includes("503"));
});

Deno.test("site: 401/403/404 on the REST root reads as the API being disabled", async () => {
  for (const status of [401, 403, 404]) {
    const { ctx } = mockCtx([{ status, body: "" }], { display: DISPLAY });
    const report = await site.check!({}, ctx);
    assertEquals(report.state, "down", String(status));
    assert((report.message ?? "").includes("disabled or blocked"), String(status));
  }
});

Deno.test("site: another non-2xx is degraded rather than down", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "" }], { display: DISPLAY });
  const report = await site.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("site: a 200 that is not JSON is degraded", async () => {
  const { ctx } = mockCtx([{
    body: "<html>maintenance</html>",
    headers: { "content-type": "text/html" },
  }], {
    display: DISPLAY,
  });
  const report = await site.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert((report.message ?? "").includes("not valid JSON"));
});

Deno.test("site: WordPress up but gf/v2 unregistered is degraded, and says why", async () => {
  const { ctx } = mockCtx([{ body: discovery(["wp/v2", "oembed/1.0"]) }], { display: DISPLAY });
  const report = await site.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert((report.message ?? "").includes("gf/v2"));
  assert((report.message ?? "").includes("Forms -> Settings -> REST API"));
});

Deno.test("site: a filtered discovery document with no namespaces array is not treated as a failure", async () => {
  const { ctx } = mockCtx([{ body: discovery(undefined) }], { display: DISPLAY });
  assertEquals((await site.check!({}, ctx)).state, "ok");
});

Deno.test("site: results carry a TTL so a host does not re-probe every render", async () => {
  const { ctx } = mockCtx([{ body: discovery(["gf/v2"]) }], { display: DISPLAY });
  assertEquals((await site.check!({}, ctx)).ttlSeconds, 120);
});
