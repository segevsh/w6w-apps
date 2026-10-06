import { assertEquals } from "@std/assert";
import api, { HEALTH_URL } from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const run = async (r: Parameters<typeof mockCtx>[0]) => {
  const { ctx, calls } = mockCtx(r);
  return { out: await api.check!({}, ctx), calls };
};

Deno.test("api: unsigned GET /health with {status:ok} is ok", async () => {
  const { out, calls } = await run([{ body: { status: "ok" } }]);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, HEALTH_URL);
  assertEquals(HEALTH_URL, "https://app.formbricks.com/health");
  assertEquals("x-api-key" in calls[0].headers, false);
});

Deno.test("api: a 200 that is not the documented body is degraded, not ok", async () => {
  assertEquals((await run([{ body: "<html>shell</html>" }])).out.state, "degraded");
  assertEquals((await run([{ body: { status: "bad" } }])).out.state, "degraded");
});

Deno.test("api: 5xx is down, other non-2xx is degraded", async () => {
  assertEquals((await run([{ status: 500, body: "<html>" }])).out.state, "down");
  assertEquals((await run([{ status: 404, body: "<html>" }])).out.state, "degraded");
});

Deno.test("api: a network failure is down", async () => {
  assertEquals((await run([])).out.state, "down");
});

Deno.test("api: declared unsigned, app scope", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.network, undefined);
});
