import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api health: the application's own JSON key refusal is a pass, sent unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 403, body: { message: "Wrong API key." } }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.webscraping.ai/account");
  assertEquals(new URL(calls[0].url).searchParams.has("api_key"), false);
});

Deno.test("api health: 5xx is down; an HTML 403 or an unrelated JSON is unknown, not ok", async () => {
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state,
    "down",
  );
  const html = mockCtx([{
    status: 403,
    headers: { "content-type": "text/html" },
    body: "<html>403</html>",
  }]);
  assertEquals((await api.check!({}, html.ctx)).state, "unknown");
  const other = mockCtx([{ status: 403, body: { message: "Forbidden by edge" } }]);
  assertEquals((await api.check!({}, other.ctx)).state, "unknown");
});

Deno.test("api health: a 200 with credit counters is ok; the check is unauthenticated and connection-scoped", async () => {
  const live = mockCtx([{ body: { remaining_total_credits: 1 } }]);
  assertEquals((await api.check!({}, live.ctx)).state, "ok");
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "connection");
});
