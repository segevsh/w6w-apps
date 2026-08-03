import { assertEquals } from "@std/assert";
import { mockCtx, mockFreshserviceCtx } from "../_helpers.ts";
import check from "../../health/domain.ts";

Deno.test("domain: needs the Connection for a URL but no credential to read it", () => {
  assertEquals(check.kind, "dependency");
  assertEquals(check.scope, "connection");
  assertEquals(check.credential, "context");
  // `*.freshservice.com` is already on the app's allowlist.
  assertEquals(check.network, undefined);
});

Deno.test("domain: a 403 passes — the portal is serving, which is the whole question", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ status: 403, body: {} }]);
  const out = await check.check!({}, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/tickets?per_page=1");
  assertEquals(out.state, "ok");
});

Deno.test("domain: 200 and 401 also pass", async () => {
  const ok = mockFreshserviceCtx([{ body: { tickets: [] } }]);
  assertEquals((await check.check!({}, ok.ctx)).state, "ok");

  const unauthorized = mockFreshserviceCtx([{ status: 401, body: {} }]);
  assertEquals((await check.check!({}, unauthorized.ctx)).state, "ok");
});

Deno.test("domain: a 404 is a missing portal, not a bad credential", async () => {
  const { ctx } = mockFreshserviceCtx([{ status: 404, body: {} }]);
  const out = await check.check!({}, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.message, "domain not found — the portal may have been renamed");
});

Deno.test("domain: a 5xx is down", async () => {
  const { ctx } = mockFreshserviceCtx([{ status: 502, body: {} }]);
  assertEquals((await check.check!({}, ctx)).state, "down");
});

Deno.test("domain: unknown, without a request, when the connection records no domain", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await check.check!({}, ctx), {
    state: "unknown",
    message: "connection records no domain",
  });
  assertEquals(calls.length, 0);
});
