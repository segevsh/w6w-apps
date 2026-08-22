import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

const component = (name: string, status: string, group = false) => ({ name, status, group });

const OPERATIONAL = {
  components: [
    component("Send signature requests", "operational"),
    component("Finished document delivery", "operational"),
    component("Document signing through Dropbox Sign and Fax", "operational"),
    component("Embedded signing through Dropbox Sign", "operational"),
    component("API callbacks from Dropbox Sign", "operational"),
    component("Fax sending through Dropbox Fax", "operational"),
    component("Core", "operational", true),
  ],
};

Deno.test("service: probes Dropbox Sign's own status page, not Dropbox's", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: OPERATIONAL }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.hellosign.com/api/v2/components.json");
  assertEquals(service.network!.allow, ["status.hellosign.com"]);
  // status.dropbox.com is a different Statuspage covering file storage.
  assert(!JSON.stringify(service).includes("status.dropbox.com"));
});

Deno.test("service: all watched components operational is ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: OPERATIONAL }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 4);
});

/** A major outage on a signing component is this app's outage. */
Deno.test("service: a signing outage is down, and names the component", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        component("Send signature requests", "major_outage"),
        component("Finished document delivery", "operational"),
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("Send signature requests"), report.message);
});

Deno.test("service: degraded performance is degraded, not down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { components: [component("Send signature requests", "degraded_performance")] },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

/**
 * The group literally named "API" holds only the outbound-callback component.
 * Watching it would report green while sending was down.
 */
Deno.test("service: the callbacks component is NOT what this app watches", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        component("API callbacks from Dropbox Sign", "major_outage"),
        component("Send signature requests", "operational"),
        component("Finished document delivery", "operational"),
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components!["api-callbacks-from-dropbox-sign"], undefined);
});

Deno.test("service: a fax outage is not this app's outage", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        component("Fax sending through Dropbox Fax", "major_outage"),
        component("Send signature requests", "operational"),
      ],
    },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: the group rows are skipped — their status is a roll-up", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        component("Send signature requests", "major_outage", true),
        component("Send signature requests", "operational"),
      ],
    },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const failed = mockCtx([{ status: 500, body: "" }]);
  assertEquals((await service.check!({}, failed.ctx)).state, "unknown");

  const junk = mockCtx([{ status: 200, body: { nope: true } }]);
  assertEquals((await service.check!({}, junk.ctx)).state, "unknown");

  const renamed = mockCtx([{
    status: 200,
    body: { components: [component("Something else", "x")] },
  }]);
  const report = await service.check!({}, renamed.ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no longer names"), report.message);
});

Deno.test("quota: reads the account endpoint, signed, once", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { account: { quotas: { documents_left: 500 } } },
  }]);
  await quota.check!({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/account");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: reports plan headroom and the hourly rate together", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "100",
      "x-ratelimit-limit-remaining": "97",
      "x-ratelimit-reset": "1787051516",
    },
    body: { account: { quotas: { api_signature_requests_left: 250, documents_left: 500 } } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message!.includes("api_signature_requests: 250"), report.message);
  assert(report.message!.includes("requests this hour: 97/100"), report.message);
  const rate = report.quota!.find((q) => q.id === "requests-per-hour")!;
  assertEquals(rate.limit, 100);
  assertEquals(rate.resetAt, new Date(1787051516 * 1000).toISOString());
});

/** An unlimited plan reports null, and null is not zero. */
Deno.test("quota: a null quota means no ceiling, not exhausted", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { account: { quotas: { documents_left: null, api_signature_requests_left: null } } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, []);
  assert(report.message!.includes("no metered quota"), report.message);
});

Deno.test("quota: zero left is down, and a small number is degraded", async () => {
  const empty = mockCtx([{ status: 200, body: { account: { quotas: { documents_left: 0 } } } }]);
  assertEquals((await quota.check!({}, empty.ctx)).state, "down");

  const low = mockCtx([{ status: 200, body: { account: { quotas: { documents_left: 3 } } } }]);
  assertEquals((await quota.check!({}, low.ctx)).state, "degraded");
});

Deno.test("quota: a rate limit almost spent is degraded even with plan quota left", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "100",
      "x-ratelimit-limit-remaining": "2",
    },
    body: { account: { quotas: { documents_left: 5000 } } },
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: an unusable credential is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("401"), report.message);
});
