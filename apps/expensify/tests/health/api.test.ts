import { assert, assertEquals } from "@std/assert";
import check from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";
import { ENDPOINT, sent } from "../_job.ts";

const LIVE_403 = { responseMessage: "No authentication method specified", responseCode: 403 };

Deno.test("api: is an unsigned dependency check on the app's own host", () => {
  assertEquals([check.kind, check.credential, check.severity], ["dependency", "none", "degraded"]);
  assertEquals(check.network, undefined);
});

Deno.test("api: the documented auth-error envelope (HTTP 200) proves reachability and sends no credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: LIVE_403 }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, ENDPOINT);
  assert(!("credentials" in sent(calls[0]).job));
});

Deno.test("api: a 404 authentication error envelope is also a pass", async () => {
  const { ctx } = mockCtx([{
    body: { responseMessage: "Authentication error", responseCode: 404 },
  }]);
  assertEquals((await check.check!({}, ctx)).state, "ok");
});

Deno.test("api: a body that is not Expensify's envelope is degraded", async () => {
  const { ctx } = mockCtx([{ body: "<html>login</html>" }]);
  assertEquals((await check.check!({}, ctx)).state, "degraded");
});

Deno.test("api: responseCode 200 unauthenticated, 429 and odd codes are degraded; 5xx is down", async () => {
  assertEquals(
    (await check.check!({}, mockCtx([{ body: { responseMessage: "OK", responseCode: 200 } }]).ctx))
      .state,
    "degraded",
  );
  assertEquals(
    (await check.check!(
      {},
      mockCtx([{ body: { responseMessage: "slow", responseCode: 429 } }]).ctx,
    )).state,
    "degraded",
  );
  assertEquals(
    (await check.check!({}, mockCtx([{ body: { responseMessage: "x", responseCode: 500 } }]).ctx))
      .state,
    "degraded",
  );
  assertEquals((await check.check!({}, mockCtx([{ status: 503, body: "" }]).ctx)).state, "down");
});

Deno.test("api: a network failure is down", async () => {
  const ctx = { fetch: () => Promise.reject(new Error("dns")), log: () => {} } as never;
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("dns"));
});
