import { assertEquals } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

const acct = (over: Record<string, unknown> = {}, q = {}) => ({
  body: {
    SendingEnabled: true,
    SendQuota: { Max24HourSend: 1000, MaxSendRate: 14, SentLast24Hours: 100, ...q },
    ...over,
  },
});

Deno.test("quota: signed GetAccount on the connection's region; headroom is reported", async () => {
  const { ctx, calls } = mockCtx([acct()], mockConnection({ region: "eu-west-1" }));
  const r = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://email.eu-west-1.amazonaws.com/v2/email/account");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.credential, "signed");
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [
    { id: "send-24h", limit: 1000, remaining: 900, unit: "emails" },
    { id: "send-rate", limit: 14, unit: "emails/second" },
  ]);
});

Deno.test("quota: 90% is degraded, 100% is down", async () => {
  const warn = mockCtx([acct({}, { SentLast24Hours: 900 })]);
  const w = await quota.check!({}, warn.ctx);
  assertEquals(w.state, "degraded");
  assertEquals(w.message, "24-hour quota at 90% (900/1000)");
  const full = mockCtx([acct({}, { SentLast24Hours: 1000 })]);
  const f = await quota.check!({}, full.ctx);
  assertEquals(f.state, "down");
  assertEquals(f.quota?.[0].remaining, 0);
});

Deno.test("quota: an over-quota count never reports a negative remaining", async () => {
  const { ctx } = mockCtx([acct({}, { SentLast24Hours: 1200 })]);
  assertEquals((await quota.check!({}, ctx)).quota?.[0].remaining, 0);
});

Deno.test("quota: a non-positive Max24HourSend means no cap, not exhausted", async () => {
  const { ctx } = mockCtx([acct({}, { Max24HourSend: -1, SentLast24Hours: 50 })]);
  assertEquals((await quota.check!({}, ctx)).state, "ok");
});

Deno.test("quota: SendingEnabled=false is down and names the enforcement status", async () => {
  const { ctx } = mockCtx([acct({ SendingEnabled: false, EnforcementStatus: "SHUTDOWN" })]);
  const r = await quota.check!({}, ctx);
  assertEquals(r.state, "down");
  assertEquals(r.message, "Sending is disabled for this account (enforcement: SHUTDOWN)");
});

Deno.test("quota: AccessDenied is unknown (says nothing about headroom); other failures too", async () => {
  const denied = mockCtx([{
    status: 403,
    body: { message: "not authorized" },
    headers: { "x-amzn-errortype": "AccessDeniedException" },
  }]);
  const r = await quota.check!({}, denied.ctx);
  assertEquals(r.state, "unknown");
  assertEquals(r.message, "GetAccount returned 403 AccessDeniedException");
  const noQuota = mockCtx([{ body: { SendingEnabled: true } }]);
  assertEquals((await quota.check!({}, noQuota.ctx)).state, "unknown");
  const junk = mockCtx([{ status: 200, body: "<html>", headers: {} }]);
  assertEquals((await quota.check!({}, junk.ctx)).state, "unknown");
});
