import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import site from "../../health/site.ts";

Deno.test("site: dependency / connection / context posture, no extra network.allow", () => {
  assertEquals(site.kind, "dependency");
  assertEquals(site.scope, "connection");
  assertEquals(site.credential, "context");
  assertEquals(site.network, undefined);
});

Deno.test("site: unknown when the connection records no siteUrl", async () => {
  const { ctx } = mockCtx();
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("site: ok on a 200 carrying a `site` object, unauthenticated", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { site: { title: "My Blog" } } }], {
    display: { siteUrl: "https://example.com" },
  });
  const result = await site.check!({}, ctx);
  assertEquals(calls[0].url, "https://example.com/ghost/api/admin/site/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.state, "ok");
});

Deno.test("site: down on 404 (wrong path / proxy stripping) and on 5xx", async () => {
  const notFound = mockCtx([{ status: 404 }], { display: { siteUrl: "https://example.com" } });
  assertEquals((await site.check!({}, notFound.ctx)).state, "down");

  const serverError = mockCtx([{ status: 503 }], { display: { siteUrl: "https://example.com" } });
  assertEquals((await site.check!({}, serverError.ctx)).state, "down");
});

Deno.test("site: degraded on a non-404 non-2xx, or a 200 with no `site` object", async () => {
  const forbidden = mockCtx([{ status: 403 }], { display: { siteUrl: "https://example.com" } });
  assertEquals((await site.check!({}, forbidden.ctx)).state, "degraded");

  const empty = mockCtx([{ status: 200, body: {} }], {
    display: { siteUrl: "https://example.com" },
  });
  assertEquals((await site.check!({}, empty.ctx)).state, "degraded");
});
