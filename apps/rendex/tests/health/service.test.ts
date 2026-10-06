import { assertEquals } from "@std/assert";
import service, { HEALTH_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const live = {
  status: "ok",
  product: "rendex",
  version: "1.8.0",
  timestamp: "2026-10-06T06:36:12Z",
};

Deno.test("service: unsigned probe of the documented /health route", () => {
  assertEquals(HEALTH_URL, "https://api.rendex.dev/health");
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
});

Deno.test("service: the live /health body is ok", async () => {
  const { ctx, calls } = mockCtx([{ body: live }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, HEALTH_URL);
  assertEquals(r.state, "ok");
  assertEquals(r.message, "Rendex 1.8.0");
});

Deno.test("service: 5xx is down; another status is degraded", async () => {
  const a = mockCtx([{ status: 503, body: "bad gateway" }]);
  assertEquals((await service.check!({}, a.ctx)).state, "down");
  const b = mockCtx([{ body: { ...live, status: "degraded" } }]);
  assertEquals((await service.check!({}, b.ctx)).state, "degraded");
});

Deno.test("service: a body that is not Rendex's is unknown, never ok", async () => {
  const html = mockCtx([{ body: "<html>shell</html>", headers: { "content-type": "text/html" } }]);
  assertEquals((await service.check!({}, html.ctx)).state, "unknown");
  const other = mockCtx([{ body: { status: "ok", product: "someone-else" } }]);
  assertEquals((await service.check!({}, other.ctx)).state, "unknown");
});
