import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service health: the documented {success:true} body is ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, version: "1.4.1" } }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://quickchart.io/healthcheck");
});

Deno.test("service health: 5xx is down; success:false is down; an unrelated 200 is unknown", async () => {
  assertEquals((await service.check!({}, mockCtx([{ status: 503, body: "x" }]).ctx)).state, "down");
  assertEquals(
    (await service.check!({}, mockCtx([{ body: { success: false } }]).ctx)).state,
    "down",
  );
  const html = mockCtx([{ headers: { "content-type": "text/html" }, body: "<html></html>" }]);
  assertEquals((await service.check!({}, html.ctx)).state, "unknown");
});

Deno.test("service health: is unauthenticated", () => {
  assertEquals(service.credential, "none");
});

Deno.test("quota health: declared unavailable with informational severity", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.check, undefined);
});
