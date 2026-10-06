import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api: a schema-correct 403 auth error is a pass (reachability proven)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 403,
    body: { error_code: 200, error_string: "Invalid token", error_extra: {}, error_uuid: "u" },
  }]);
  const r = await api.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://api.twist.com/api/v3/workspaces/get");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("api: an HTML shell on a 200 is not a pass", async () => {
  const { ctx } = mockCtx([{ body: "<html>spa</html>", headers: { "content-type": "text/html" } }]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});

Deno.test("api: a JSON body that is not Twist's envelope is unknown", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await api.check!({}, ctx)).state, "unknown");
});

Deno.test("api: a 5xx is down", async () => {
  const { ctx } = mockCtx([{
    status: 503,
    body: { error_code: 201, error_string: "Internal Server Error" },
  }]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});

Deno.test("api: is unsigned, app-scoped dependency check", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.kind, "dependency");
});

Deno.test("quota: declared unavailable with informational severity", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.check, undefined);
});
