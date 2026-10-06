import { assert, assertEquals } from "@std/assert";
import api from "../health/api.ts";
import quota from "../health/quota.ts";
import service, { pngWidth } from "../health/service.ts";
import { errorBody, mockCtx, pathOf } from "./_helpers.ts";

/** A minimal PNG signature + IHDR carrying `width`, enough for the width read. */
function png(width: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, 1);
  return b;
}
const runApi = (ctx: unknown) => api.check!({} as never, ctx as never);
const runService = (ctx: unknown) => service.check!({} as never, ctx as never);

Deno.test("pngWidth: reads IHDR width; rejects non-PNG and short input", () => {
  assertEquals(pngWidth(png(1)), 1);
  assertEquals(pngWidth(png(173)), 173);
  assertEquals(pngWidth(new TextEncoder().encode("<html>".padEnd(40))), undefined);
  assertEquals(pngWidth(new Uint8Array(5)), undefined);
});

Deno.test("service: declares an unsigned, app-scoped service check with no extra host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network, undefined);
});

Deno.test("service: a 1x1 PNG is up (the vendor's own rule)", async () => {
  const calls: string[] = [];
  const ctx = {
    fetch: (url: string) => {
      calls.push(url);
      return Promise.resolve(new Response(png(1) as BodyInit, { status: 200 }));
    },
    log: () => {},
  };
  const r = await runService(ctx);
  assertEquals(r.state, "ok");
  assert(pathOf(calls[0]).startsWith("/status_check/") && pathOf(calls[0]).endsWith(".png"));
  assertEquals(new URL(calls[0]).hostname, "app.onepagecrm.com");
});

Deno.test("service: an image of another size is maintenance (degraded)", async () => {
  const ctx = {
    fetch: () => Promise.resolve(new Response(png(173) as BodyInit, { status: 200 })),
    log: () => {},
  };
  assertEquals((await runService(ctx)).state, "degraded");
});

Deno.test("service: HTML answering 200 is not the 1x1 PNG, so degraded not ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html>maintenance page padded to length....</html>",
  }]);
  assertEquals((await runService(ctx)).state, "degraded");
});

Deno.test("service: 5xx is down, a 404 is unknown", async () => {
  assertEquals((await runService(mockCtx([{ status: 503, body: "x" }]).ctx)).state, "down");
  assertEquals((await runService(mockCtx([{ status: 404, body: "x" }]).ctx)).state, "unknown");
});

Deno.test("api: an unsigned schema-correct 401 is a pass (reachability proven)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: errorBody("authorization_data_not_found", "Authorization data not found", 401),
  }]);
  const r = await runApi(ctx);
  assertEquals(r.state, "ok");
  assertEquals(pathOf(calls[0].url), "/api/v3/users");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: invalid_login 401 with body status 400 is still a pass", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("invalid_login", "x") }]);
  assertEquals((await runApi(ctx)).state, "ok");
});

Deno.test("api: 5xx and service_unavailable are down", async () => {
  assertEquals(
    (await runApi(
      mockCtx([{ status: 500, body: errorBody("internal_server_error", "x", 500) }]).ctx,
    )).state,
    "down",
  );
  assertEquals(
    (await runApi(mockCtx([{ status: 503, body: errorBody("service_unavailable", "x", 503) }]).ctx))
      .state,
    "down",
  );
});

Deno.test("api: an HTML shell answering 200 is down, not ok", async () => {
  assertEquals((await runApi(mockCtx([{ status: 200, body: "<html></html>" }]).ctx)).state, "down");
});

Deno.test("api: JSON that is not the vendor error envelope is unknown", async () => {
  assertEquals(
    (await runApi(mockCtx([{ status: 200, body: { hello: "world" } }]).ctx)).state,
    "unknown",
  );
});

Deno.test("api: the plain-text throttle 403 gives no verdict (unknown), not a permission fail", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    headers: { "content-type": "text/plain" },
    body: "Rate Limit Exceeded",
  }]);
  assertEquals((await runApi(ctx)).state, "unknown");
});

Deno.test("quota: declared unavailable at informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason);
  assertEquals(quota.check, undefined);
});
