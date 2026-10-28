import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import api from "../../health/api.ts";

const input = { credential: undefined } as never;

Deno.test("health/api: unsigned dependency probe at app scope", () => {
  assertEquals(api.kind, "dependency");
  assertEquals(api.scope, "app");
  assertEquals(api.credential, "none");
});

Deno.test("health/api: Graph's OAuth error envelope (code 2500) is a pass", async () => {
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: {
      error: { message: "An active access token must be used", type: "OAuthException", code: 2500 },
    },
  }]);
  const r = await api.check!(input, ctx);
  assertEquals(r.state, "ok");
  assertEquals(new URL(calls[0].url).pathname, "/v26.0/me");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("health/api: code 190 is also a pass — reachability, not credential validity", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { message: "Invalid OAuth access token", type: "OAuthException", code: 190 } },
  }]);
  assertEquals((await api.check!(input, ctx)).state, "ok");
});

Deno.test("health/api: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "unavailable" }]);
  assertEquals((await api.check!(input, ctx)).state, "down");
});

Deno.test("health/api: an HTML shell is down, even on a 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>shell</html>" }]);
  assertEquals((await api.check!(input, ctx)).state, "down");
});

Deno.test("health/api: JSON that is not a Graph envelope is unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await api.check!(input, ctx)).state, "unknown");
});
