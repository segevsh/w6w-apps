import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import ping, { PROBE_URL } from "../../health/ping.ts";
import { mockCtx, problemBody } from "../_helpers.ts";

test("ping: probes the app's own host unsigned, widening nothing", () => {
  assertEquals(PROBE_URL, "https://api.acculynx.com/api/v2/diagnostics/ping");
  assertEquals(ping.credential, "none");
  assertEquals(ping.network, undefined);
});

test("ping: 200 with the documented date field is ok, and sends no credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { date: "2026-10-06T02:26:38Z" } }]);
  const out = await ping.check!({} as never, ctx);
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out.state, "ok");
});

test("ping: a schema-correct 401 still proves reachability", async () => {
  const { ctx } = mockCtx([{ status: 401, body: problemBody(401, "API Key is invalid.") }]);
  assertEquals((await ping.check!({} as never, ctx)).state, "ok");
});

test("ping: a generic 200 without the date field is down, not a pass", async () => {
  for (const body of [{ ok: true }, "<html>SPA shell</html>", ""]) {
    const { ctx } = mockCtx([{ status: 200, body }]);
    const out = await ping.check!({} as never, ctx);
    assertEquals(out.state, "down", JSON.stringify(body));
  }
});

test("ping: 404 and 5xx are down", async () => {
  for (const status of [404, 502]) {
    const { ctx } = mockCtx([{ status, body: "" }]);
    const out = await ping.check!({} as never, ctx);
    assertEquals(out.state, "down");
    assert(out.message!.includes(String(status)));
  }
});
