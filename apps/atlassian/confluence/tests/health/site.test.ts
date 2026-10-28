import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import site from "../../health/site.ts";

Deno.test("site: is an unsigned, connection-scoped dependency check", () => {
  assertEquals(site.kind, "dependency");
  assertEquals(site.scope, "connection");
  assertEquals(site.credential, "context");
  // `*.atlassian.net` is already on the app's allowlist, and a context check is
  // unsigned regardless.
  assertEquals(site.network, undefined);
});

Deno.test("site: RUNNING is ok, and the probe is unauthenticated", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { state: "RUNNING" } }], {
    display: { site: "acme" },
  });
  const result = await site.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://acme.atlassian.net/status");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.state, "ok");
});

Deno.test("site: an OAuth connection's resolved site URL is used when there is no site name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { state: "MAINTENANCE" } }], {
    display: { cloudId: "cid", siteUrl: "https://acme.atlassian.net/" },
  });
  const result = await site.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://acme.atlassian.net/status");
  assertEquals(result.state, "degraded");
});

Deno.test("site: a site that does not answer is down", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], { display: { site: "acme" } });
  const result = await site.check!({} as never, ctx) as { state: string; message: string };
  assertEquals(result.state, "down");
  assert(result.message.includes("404"), result.message);
});

Deno.test("site: a connection with no site yet reports unknown, not down", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  const result = await site.check!({} as never, ctx) as { state: string; message: string };
  assertEquals(result.state, "unknown");
  assert(result.message.includes("no site"), result.message);
  assertEquals(calls.length, 0);
});
