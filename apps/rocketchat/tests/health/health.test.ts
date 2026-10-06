import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";
import site from "../../health/site.ts";
import { mockCtx } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => site.check!({} as never, ctx);

Deno.test("service and quota: declared absences at informational severity", () => {
  for (const h of [service, quota]) {
    assertEquals(h.severity, "informational");
    assertEquals(typeof h.unavailable?.reason, "string");
    assertEquals(h.check, undefined);
  }
  assertEquals(service.kind, "service");
  assertEquals(quota.kind, "quota");
});

Deno.test("site: an unsigned, per-connection dependency probe", () => {
  assertEquals(site.kind, "dependency");
  assertEquals(site.credential, "context");
  assertEquals(site.scope, "connection");
});

Deno.test("site: the schema-correct JSON 401 is a PASS and nothing is signed", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: { success: false, status: "error", message: "You must be logged in to do this." },
  }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(calls[0].url, "https://acme.rocket.chat/api/v1/me");
  assertEquals(calls[0].headers["x-auth-token"], undefined);
});

Deno.test("site: an HTML 200 and a 5xx are down; no workspace is unknown", async () => {
  const html = mockCtx([{ body: "<html>parked</html>", headers: { "content-type": "text/html" } }]);
  assertEquals((await run(html.ctx)).state, "down");
  const five = mockCtx([{ status: 502, body: "bad gateway" }]);
  assertEquals((await run(five.ctx)).state, "down");
  const none = mockCtx([], { display: {} });
  assertEquals((await run(none.ctx)).state, "unknown");
  assertEquals(none.calls.length, 0);
});
