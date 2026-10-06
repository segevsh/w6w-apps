import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import api from "../../health/api.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

// deno-lint-ignore no-explicit-any
const run = (check: any, ctx: any) => check.check({}, ctx);

const GRAPH_401 = {
  error: {
    code: "InvalidAuthenticationToken",
    message: "Access token is empty.",
    innerError: { date: "2026-10-06T02:26:49", "request-id": "x" },
  },
};

Deno.test("api: an unsigned Graph 401 error envelope is a PASS", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: GRAPH_401 }]);
  const out = await run(api, ctx);
  assertEquals(calls[0].url, "https://graph.microsoft.com/v1.0/organization");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out.state, "ok");
  assert(out.message.includes("InvalidAuthenticationToken"));
});

Deno.test("api: is an unsigned, app-scoped dependency check", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.kind, "dependency");
});

Deno.test("api: a 5xx is down, even with a JSON body", async () => {
  const { ctx } = mockCtx([{ status: 503, body: GRAPH_401 }]);
  assertEquals((await run(api, ctx)).state, "down");
});

Deno.test("api: an HTML edge page is down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html>sign in</html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await run(api, ctx)).state, "down");
});

Deno.test("api: JSON that is not an error envelope is unknown, not a pass", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await run(api, ctx)).state, "unknown");
  const { ctx: ctx2 } = mockCtx([{ status: 401, body: { error: { code: 401 } } }]);
  assertEquals((await run(api, ctx2)).state, "unknown");
});

Deno.test("service and quota: declared unavailable and informational, with a reason", () => {
  for (const check of [service, quota]) {
    assertEquals(check.severity, "informational");
    assert((check.unavailable?.reason.length ?? 0) > 40);
    assertEquals(check.check, undefined);
  }
});
