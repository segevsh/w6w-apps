import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import check, { mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const PAGE = { id: "01KHV8MXEE2KYXQQVB9VR9D5BA", name: "MailerSend" };
const comp = (id: string, name: string, status = "operational") => ({ id, name, status });
const summary = (over: Record<string, string> = {}) => ({
  page: PAGE,
  status: { indicator: "none", description: "All Systems Operational" },
  components: [
    comp("01KHV8MXEEH5TZCJNAJT34VNFT", "Email sending API", over.send),
    comp("01KHV8MXEE3EXZW98Y8RKS40WF", "Bulk endpoint", over.bulk),
    comp("01KHV8MXEEQ0QJ63NPENMK8NWC", "MailerSend APP", over.app),
    comp("x1", "SMTP", over.smtp),
  ],
});

test("service: declares credential none and its own host", () => {
  assertEquals(check.credential, "none");
  assertEquals(check.network, { allow: ["status.mailersend.com"] });
});

test("service: all operational is ok and calls the summary on the status host", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const r = await check.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(new URL(calls[0].url).host, "status.mailersend.com");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/summary.json");
});

test("service: the worst deciding component wins; a non-deciding one never moves it", async () => {
  const a = mockCtx([{ body: summary({ bulk: "partial_outage" }) }]);
  assertEquals((await check.check!({}, a.ctx)).state, "degraded");
  const b = mockCtx([{ body: summary({ send: "full_outage", bulk: "partial_outage" }) }]);
  assertEquals((await check.check!({}, b.ctx)).state, "down");
  const c = mockCtx([{ body: summary({ smtp: "full_outage" }) }]);
  const r = await check.check!({}, c.ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.components!["smtp"].state, "down");
});

test("service: another page id reads unknown", async () => {
  const body = { ...summary(), page: { id: "other", name: "Other" } };
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await check.check!({}, ctx)).state, "unknown");
});

test("service: a failing or unreadable page reads unknown, never down", async () => {
  const a = mockCtx([{ status: 500, body: "x" }]);
  assertEquals((await check.check!({}, a.ctx)).state, "unknown");
  const b = mockCtx([{ body: "not json" }]);
  assertEquals((await check.check!({}, b.ctx)).state, "unknown");
});

test("service: with no deciding component the page indicator decides", async () => {
  const body = {
    page: PAGE,
    status: { indicator: "critical" },
    components: [comp("x", "Website")],
  };
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await check.check!({}, ctx)).state, "down");
});

test("service: status mappings", () => {
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("weird"), "unknown");
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator(undefined), "unknown");
});
