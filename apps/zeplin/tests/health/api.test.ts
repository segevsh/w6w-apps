import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api health: the application's own JSON invalid_token refusal is a pass, sent unsigned", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: { message: "invalid_token", detail: "Authorization header is missing" },
  }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.zeplin.dev/v1/users/me");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api health: 5xx is down; an HTML 401 or an unrelated JSON is unknown, not ok", async () => {
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state,
    "down",
  );
  const html = mockCtx([{
    status: 401,
    headers: { "content-type": "text/html" },
    body: "<html>401</html>",
  }]);
  assertEquals((await api.check!({}, html.ctx)).state, "unknown");
  const other = mockCtx([{ status: 401, body: { message: "Forbidden by edge" } }]);
  assertEquals((await api.check!({}, other.ctx)).state, "unknown");
  const ok200 = mockCtx([{ body: { id: "x" } }]);
  assertEquals((await api.check!({}, ok200.ctx)).state, "unknown");
});

Deno.test("api health: the check is unauthenticated and connection-scoped", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "connection");
  assertEquals(api.kind, "dependency");
});
