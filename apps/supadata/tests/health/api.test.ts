import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api health: the application's own JSON unauthorized refusal is a pass, sent unsigned", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: { error: "unauthorized", message: "Unauthorized", details: "Missing API Key" },
  }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/me");
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("api health: 5xx is down; an HTML 401 or another JSON is unknown, not ok", async () => {
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
  const other = mockCtx([{
    status: 401,
    body: { error: "forbidden", message: "m", details: "d" },
  }]);
  assertEquals((await api.check!({}, other.ctx)).state, "unknown");
});

Deno.test("api health: is unauthenticated and connection-scoped", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "connection");
});
