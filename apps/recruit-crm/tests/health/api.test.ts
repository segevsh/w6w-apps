import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api: declared unsigned dependency check", () => {
  assertEquals(api.kind, "dependency");
  assertEquals(api.credential, "none");
});

Deno.test("api: a schema-correct 401 is a pass", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: { error: "Unauthorized" } }]);
  const out = await api.check!({} as never, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://api.recruitcrm.io/v1/users");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("api: a 5xx is down, HTML is down, an unknown JSON shape is unknown", async () => {
  const a = mockCtx([{ status: 502, body: { error: "bad gateway" } }]);
  assertEquals((await api.check!({} as never, a.ctx)).state, "down");
  const b = mockCtx([{ status: 200, body: "<html>", headers: { "content-type": "text/html" } }]);
  assertEquals((await api.check!({} as never, b.ctx)).state, "down");
  const c = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await api.check!({} as never, c.ctx)).state, "unknown");
});

Deno.test("quota: is a declared, informational absence with no hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.check, undefined);
});
