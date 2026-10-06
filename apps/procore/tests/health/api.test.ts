import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import api from "../../health/api.ts";

Deno.test("api: a Procore JSON 401 (error key) is a pass", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: { error: "Invalid Token" } }]);
  const r = await api.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://api.procore.com/rest/v1.0/me");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: the expired-token envelope (errors key) is a pass too", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Your access token has expired" } }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
});

Deno.test("api: a 5xx is down, a non-JSON edge page or foreign JSON is unknown", async () => {
  const down = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await api.check!({}, down.ctx)).state, "down");
  const html = mockCtx([{ status: 200, body: "<html>shell</html>" }]);
  assertEquals((await api.check!({}, html.ctx)).state, "unknown");
  const foreign = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await api.check!({}, foreign.ctx)).state, "unknown");
});

Deno.test("api: declares no credential", () => {
  assertEquals(api.credential, "none");
});
