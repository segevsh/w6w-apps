import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx, pathOf, unauthorized } from "../_helpers.ts";

Deno.test("api: is an unsigned dependency check", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.kind, "dependency");
});

Deno.test("api: the schema-correct 401 proves the API is serving", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: unauthorized }]);
  const out = await api.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(pathOf(calls[0].url), "/v3/debug/ttl");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("api: a 5xx is down, a non-JSON body is down, an unknown JSON 4xx is unknown", async () => {
  const five = mockCtx([{ status: 503, body: unauthorized }]);
  assertEquals((await api.check!({}, five.ctx)).state, "down");
  const html = mockCtx([{ status: 200, body: "<html>shell</html>" }]);
  assertEquals((await api.check!({}, html.ctx)).state, "down");
  const odd = mockCtx([{ status: 418, body: { teapot: true } }]);
  assertEquals((await api.check!({}, odd.ctx)).state, "unknown");
});
