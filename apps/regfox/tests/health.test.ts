import { assert, assertEquals } from "@std/assert";
import api, { API_URL } from "../health/api.ts";
import quota, { headroom } from "../health/quota.ts";
import service from "../health/service.ts";
import { mockCtx } from "./_helpers.ts";

const PING = { responseCode: 200, data: "Some nights I always win, I always win..." };

Deno.test("health/api: the documented ping envelope is ok, sent unsigned", async () => {
  const { ctx, calls } = mockCtx([{ body: PING }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, API_URL);
  assertEquals(calls[0].headers["apikey"], undefined);
  assertEquals(api.credential, "none");
});

Deno.test("health/api: 5xx is down; a 200 HTML shell or other JSON is unknown", async () => {
  const html = { "content-type": "text/html" };
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 502, body: "<html>bad</html>", headers: html }]).ctx))
      .state,
    "down",
  );
  assertEquals(
    (await api.check!({}, mockCtx([{ body: "<html>shell</html>", headers: html }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await api.check!({}, mockCtx([{ body: { hello: "world" } }]).ctx)).state,
    "unknown",
  );
});

Deno.test("health/quota: reads daily and burst headroom from a signed response", async () => {
  const { ctx, calls } = mockCtx([{
    body: { responseCode: 200, data: [] },
    headers: {
      "content-type": "application/json",
      "x-daily-limit": "10000",
      "x-daily-remaining": "9000",
      "x-daily-limit-reset": "1893456000",
      "x-burst-limit": "900",
      "x-burst-remaining": "898",
      "x-burst-limit-reset": "600",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://api.webconnex.com/v2/public/forms?limit=1");
  assertEquals(report.quota?.map((q) => q.id), ["daily", "burst"]);
  assertEquals(report.quota?.[0].remaining, 9000);
  assertEquals(report.quota?.[0].resetAt, "2030-01-01T00:00:00.000Z");
  assert(report.quota?.[1].resetAt);
  assertEquals(quota.credential, "signed");
});

Deno.test("health/quota: exhausted burst is down, low daily is degraded, no header is unknown", async () => {
  const mk = (h: Record<string, string>) =>
    mockCtx([{
      body: { responseCode: 200, data: [] },
      headers: { "content-type": "application/json", ...h },
    }]).ctx;
  assertEquals(
    (await quota.check!(
      {},
      mk({
        "x-daily-limit": "100",
        "x-daily-remaining": "50",
        "x-burst-limit": "900",
        "x-burst-remaining": "0",
      }),
    )).state,
    "down",
  );
  assertEquals(
    (await quota.check!({}, mk({ "x-daily-limit": "100", "x-daily-remaining": "5" }))).state,
    "degraded",
  );
  assertEquals((await quota.check!({}, mk({}))).state, "unknown");
  assertEquals(headroom(undefined, 10), "unknown");
});

Deno.test("health: service is an informational declared absence", () => {
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.includes("status page"));
  assertEquals(service.check, undefined);
  assertEquals(quota.severity, "informational");
});

Deno.test("lib/client: a 5xx non-JSON body surfaces its text, not a parse error", async () => {
  const { RegfoxClient } = await import("../lib/client.ts");
  const { ctx } = mockCtx([{
    status: 502,
    body: "bad gateway",
    headers: { "content-type": "text/plain" },
  }]);
  let msg = "";
  try {
    await new RegfoxClient(ctx).call("/forms");
  } catch (e) {
    msg = (e as Error).message;
  }
  assert(msg.includes("HTTP 502") && msg.includes("bad gateway"), msg);
});
