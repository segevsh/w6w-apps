import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import portal from "../../health/portal.ts";

const conn = { display: { portalUrl: "https://myportal.bitrix24.com" } };

test("portal: an {error} body proves a live Bitrix24 router answered", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 401,
      body: { error: "NO_AUTH_FOUND", error_description: "Wrong authorization data" },
    },
  ], conn);
  const report = await portal.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://myportal.bitrix24.com/rest/method.get");
  assert(!calls[0].headers.authorization, "the portal-reachability check must be unsigned");
});

test("portal: a 200 with {result} is also reachable", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { result: { isExisting: true, isAvailable: true }, time: {} } },
  ], conn);
  const report = await portal.check!({}, ctx);
  assertEquals(report.state, "ok");
});

test("portal: something answering non-JSON is degraded, not assumed down", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: "<html>not bitrix24</html>", headers: { "content-type": "text/html" } },
  ], conn);
  const report = await portal.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

test("portal: an unreachable host is down", async () => {
  const { ctx } = mockCtx([], conn);
  const report = await portal.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("unreachable"));
});

test("portal: a connection with no URL is unknown, not down", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const report = await portal.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("portal: is a connection-scoped, unsigned dependency check", () => {
  assertEquals(portal.kind, "dependency");
  assertEquals(portal.scope, "connection");
  assertEquals(portal.credential, "context");
});
