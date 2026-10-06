import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx, region } from "../_helpers.ts";

const ISSUE = "Invalid API key. Please check your API key and try again. (requestId: 9)";

Deno.test("api health: the application's own 401 refusal is a pass, and no real token is sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: ISSUE }], { connection: region("ams") });
  const out = await api.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://production-ams.browserless.io/active?token=w6w-health-probe");
});

Deno.test("api health: 204 passes; 5xx is down; an HTML edge 401 is unknown, not ok", async () => {
  assertEquals((await api.check!({}, mockCtx([{ status: 204 }]).ctx)).state, "ok");
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state,
    "down",
  );
  const html = mockCtx([{
    status: 401,
    headers: { "content-type": "text/html" },
    body: "<html>401 Authorization Required</html>",
  }]);
  assertEquals((await api.check!({}, html.ctx)).state, "unknown");
});

Deno.test("api health: is unauthenticated, connection-scoped", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "connection");
});
