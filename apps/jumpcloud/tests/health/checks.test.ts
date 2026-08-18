import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

const component = (name: string, status: string, group = false) => ({ name, status, group });

const ALL_REGIONS = {
  components: [
    component("General Access API - US Region", "operational"),
    component("Commands - US Region", "operational"),
    component("Groups (user/devices) - US Region", "operational"),
    component("General Access API - EU Region", "operational"),
    component("Commands - EU Region", "operational"),
    component("Groups (user/devices) - EU Region", "operational"),
    component("LDAP - US Region", "major_outage"),
    component("Payment and Billing - US Region", "major_outage"),
    component("General Access API", "operational", true),
  ],
};

Deno.test("service: probes the status page unsigned, with the host declared", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: ALL_REGIONS }], { display: {} });
  await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.jumpcloud.com/api/v2/components.json");
  assertEquals(service.network!.allow, ["status.jumpcloud.com"]);
  // It needs the Connection for the region, but never the credential.
  assertEquals(service.credential, "context");
  assertEquals(service.scope, "connection");
});

Deno.test("service: reads the three components this app rides on", async () => {
  const { ctx } = mockCtx([{ status: 200, body: ALL_REGIONS }], { display: { region: "us" } });
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).sort(), [
    "commands-us-region",
    "general-access-api-us-region",
    "groups-user-devices-us-region",
  ]);
});

/** LDAP, RADIUS, SSO and billing are real services no action here touches. */
Deno.test("service: an outage in a service this app does not use is not its outage", async () => {
  const { ctx } = mockCtx([{ status: 200, body: ALL_REGIONS }], { display: { region: "us" } });
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

/** The whole point of the per-region design. */
Deno.test("service: an EU outage does not touch a US connection, and vice versa", async () => {
  const body = {
    components: [
      component("General Access API - US Region", "operational"),
      component("General Access API - EU Region", "major_outage"),
    ],
  };
  const us = mockCtx([{ status: 200, body }], { display: { region: "us" } });
  assertEquals((await service.check!({}, us.ctx)).state, "ok");

  const eu = mockCtx([{ status: 200, body }], { display: { region: "eu" } });
  const report = await service.check!({}, eu.ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("EU Region"), report.message);
});

Deno.test("service: an unset region reads as US", async () => {
  const { ctx } = mockCtx([{ status: 200, body: ALL_REGIONS }], { display: {} });
  const report = await service.check!({}, ctx);
  assert(report.components!["general-access-api-us-region"]);
});

Deno.test("service: degraded performance is degraded, not down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { components: [component("General Access API - US Region", "degraded_performance")] },
  }], { display: { region: "us" } });
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

/** A group heading's status rolls up every region at once. */
Deno.test("service: the group headings are skipped", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        component("General Access API - US Region", "major_outage", true),
        component("General Access API - US Region", "operational"),
      ],
    },
  }], { display: { region: "us" } });
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const failed = mockCtx([{ status: 503, body: "" }], { display: {} });
  assertEquals((await service.check!({}, failed.ctx)).state, "unknown");

  const junk = mockCtx([{ status: 200, body: { nope: true } }], { display: {} });
  assertEquals((await service.check!({}, junk.ctx)).state, "unknown");

  const renamed = mockCtx([{ status: 200, body: { components: [component("Something", "x")] } }], {
    display: { region: "in" },
  });
  const report = await service.check!({}, renamed.ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("IN components"), report.message);
});

/**
 * A declared absence, not a gap: JumpCloud rate limits but publishes no header
 * and no usage endpoint.
 */
Deno.test("quota: is a declared absence, with the measurement in the reason", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  const reason = quota.unavailable!.reason;
  assert(reason.includes("2026-08-18"), reason);
  assert(reason.includes("Retry-After"), reason);
  assert(reason.includes("429"), reason);
});
