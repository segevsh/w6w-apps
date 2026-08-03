import { assert, assertEquals } from "@std/assert";
import site from "../../health/site.ts";
import { mockCtx, mockDiscourseCtx, SITE_URL } from "../_helpers.ts";

const BASIC_INFO = {
  title: "Example Forum",
  description: "A forum",
  login_required: false,
  locale: "en",
};

Deno.test("site: is a per-connection dependency read without a credential", () => {
  assertEquals(site.kind, "dependency");
  assertEquals(site.scope, "connection");
  // `context`: the Connection supplies the URL, not a credential. `sign` must
  // not run for this check.
  assertEquals(site.credential, "context");
  assertEquals(site.network, undefined);
  assertEquals(site.minIntervalSeconds, 120);
});

Deno.test("site: probes /site/basic-info.json — the endpoint exempt from the login gate", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: BASIC_INFO }]);
  const report = await site.check!({}, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/site/basic-info.json`);
  assertEquals(calls[0].method, "GET");
  // Unsigned: no credential header may appear on this request.
  assertEquals(calls[0].headers["api-key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(report.state, "ok");
  // The forum's title is echoed back so an operator can see WHICH forum
  // answered — a Connection pointed at the wrong site is the commonest failure.
  assertEquals(report.message, "Example Forum");
});

Deno.test("site: a private forum is healthy — basic-info answers even when login is required", async () => {
  const { ctx } = mockDiscourseCtx([{ body: { ...BASIC_INFO, login_required: true } }]);
  assertEquals((await site.check!({}, ctx)).state, "ok");
});

Deno.test("site: 5xx and a missing route are down; other failures are degraded", async () => {
  const five = mockDiscourseCtx([{ status: 502, body: "bad gateway" }]);
  const fiveReport = await site.check!({}, five.ctx);
  assertEquals(fiveReport.state, "down");
  assert(fiveReport.message!.includes("502"));

  const gone = mockDiscourseCtx([{ status: 404, body: "" }]);
  const goneReport = await site.check!({}, gone.ctx);
  assertEquals(goneReport.state, "down");
  assert(goneReport.message!.includes("not routed"));

  const forbidden = mockDiscourseCtx([{ status: 403, body: {} }]);
  assertEquals((await site.check!({}, forbidden.ctx)).state, "degraded");
});

Deno.test("site: a 200 that is not Discourse is degraded, not ok", async () => {
  // A parked page, a captive portal or a proxy error page all answer 200. The
  // host is reachable; this forum is not what is on it.
  const html = mockDiscourseCtx([{ status: 200, body: "<html>parked</html>" }]);
  const report = await site.check!({}, html.ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("did not return Discourse"));

  const wrongJson = mockDiscourseCtx([{ body: { hello: "world" } }]);
  assertEquals((await site.check!({}, wrongJson.ctx)).state, "degraded");
});

Deno.test("site: reports unknown, and makes no request, when the connection has no URL", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = { display: {} };
  const report = await site.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no site URL"));
  assertEquals(calls.length, 0);
});

Deno.test("site: an unusable stored URL reports unknown rather than throwing", async () => {
  const { ctx, calls } = mockDiscourseCtx([], "https://");
  assertEquals((await site.check!({}, ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});
