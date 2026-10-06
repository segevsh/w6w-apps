import { assert, assertEquals } from "@std/assert";
import check from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const LIVE_401 = {
  meta: {
    success: false,
    status: 401,
    error_code: "auth_not_provided",
    error_desc: "This operation requires authentication",
  },
};

Deno.test("api: is an unsigned dependency check on the app's own host", () => {
  assertEquals([check.kind, check.credential, check.severity], ["dependency", "none", "degraded"]);
  assertEquals(check.network, undefined);
});

Deno.test("api: the documented 401 envelope proves reachability and sends no credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: LIVE_401 }]);
  assertEquals((await check.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://app.klipfolio.com/api/1.0/profile");
  assert(!("kf-api-key" in calls[0].headers));
});

Deno.test("api: a 401 that is not Klipfolio's envelope is degraded", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>login</html>" }]);
  assertEquals((await check.check!({}, ctx)).state, "degraded");
});

Deno.test("api: a 200, a 404 and a 5xx are classified", async () => {
  assertEquals((await check.check!({}, mockCtx([{ body: {} }]).ctx)).state, "degraded");
  assertEquals(
    (await check.check!({}, mockCtx([{ status: 404, body: "x" }]).ctx)).state,
    "degraded",
  );
  assertEquals((await check.check!({}, mockCtx([{ status: 503, body: "x" }]).ctx)).state, "down");
});

Deno.test("api: a network failure is down", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("tls")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof check.check>>[1];
  assertEquals((await check.check!({}, ctx)).state, "down");
});
