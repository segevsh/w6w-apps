import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api health: Rootly's JSON errors 401 is a pass, and no credential is sent", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: { errors: [{ title: "Invalid token", status: "401" }] },
  }]);
  const out = await api.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://api.rootly.com/v1/users/me");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api health: 5xx is down; an HTML page is unknown, not ok", async () => {
  assertEquals((await api.check!({}, mockCtx([{ status: 503, body: "x" }]).ctx)).state, "down");
  const html = mockCtx([{
    status: 403,
    headers: { "content-type": "text/html" },
    body: "<html>Just a moment...</html>",
  }]);
  assertEquals((await api.check!({}, html.ctx)).state, "unknown");
});

Deno.test("api health: is unauthenticated and app-scoped", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.kind, "dependency");
});
