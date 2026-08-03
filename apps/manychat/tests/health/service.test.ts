import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

/** A trimmed but faithful copy of the live payload, checked 2026-08-03. */
const components = (overrides: Record<string, string> = {}) => ({
  components: [
    { id: "a", name: "Manychat: Web Application", status: "OPERATIONAL", group: null },
    { id: "b", name: "Manychat: Message sending", status: "OPERATIONAL", group: null },
    { id: "c", name: "Manychat: Public API", status: "OPERATIONAL", group: null },
    { id: "d", name: "3rd party: Instagram API", status: "OPERATIONAL", group: null },
    { id: "e", name: "3rd party: WhatsApp API", status: "OPERATIONAL", group: null },
  ].map((c) => (overrides[c.name] ? { ...c, status: overrides[c.name] } : c)),
});

Deno.test("service: probes the Instatus components endpoint, unsigned", async () => {
  const { ctx, calls } = mockCtx([{ body: components() }]);
  await service.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://status.manychat.com/v2/components.json");
  assert(!("authorization" in calls[0].headers), "a status host must never see a credential");
});

Deno.test("service: declares the status host on the hook, not the app allowlist", () => {
  assertEquals(service.network?.allow, ["status.manychat.com"]);
});

Deno.test("service: all operational reports ok", async () => {
  const { ctx } = mockCtx([{ body: components() }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.message, undefined);
});

Deno.test("service: the verdict tracks the Public API component", async () => {
  const { ctx } = mockCtx([{ body: components({ "Manychat: Public API": "MAJOROUTAGE" }) }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "down");
  assert(report.message?.includes("Public API"), report.message);
});

Deno.test("service: DEGRADEDPERFORMANCE on the API maps to degraded", async () => {
  const { ctx } = mockCtx([
    { body: components({ "Manychat: Public API": "DEGRADEDPERFORMANCE" }) },
  ]);
  assertEquals((await service.check!({} as never, ctx)).state, "degraded");
});

Deno.test("service: a third-party channel outage does NOT drive the verdict", async () => {
  // A Messenger-only tenant cannot feel a WhatsApp API outage. Reporting it as
  // degraded would be a false alarm about a channel they do not use.
  const { ctx } = mockCtx([{ body: components({ "3rd party: WhatsApp API": "MAJOROUTAGE" }) }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["3rd-party-whatsapp-api"].state, "down");
});

Deno.test("service: a Manychat non-API component does not drive the verdict either", async () => {
  const { ctx } = mockCtx([{ body: components({ "Manychat: Web Application": "MAJOROUTAGE" }) }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["manychat-web-application"].state, "down");
});

Deno.test("service: every component is reported for attribution", async () => {
  const { ctx } = mockCtx([{ body: components() }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(Object.keys(report.components ?? {}).sort(), [
    "3rd-party-instagram-api",
    "3rd-party-whatsapp-api",
    "manychat-message-sending",
    "manychat-public-api",
    "manychat-web-application",
  ]);
});

Deno.test("service: an unknown Instatus vocabulary word reports unknown, not ok", async () => {
  const { ctx } = mockCtx([{ body: components({ "Manychat: Public API": "SOMETHING_NEW" }) }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

Deno.test("service: a missing Public API component reports unknown and says why", async () => {
  const { ctx } = mockCtx([
    {
      body: { components: [{ id: "a", name: "Manychat: Web Application", status: "OPERATIONAL" }] },
    },
  ]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("public api"), report.message);
});

Deno.test("service: a failing status page reports unknown, never down", async () => {
  // A status page that is itself broken says nothing about the vendor.
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("503"), report.message);
});

Deno.test("service: a 200 with an error body is refused, not interpreted", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { error: "Your page is inactive." } }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("unexpected payload"), report.message);
});

Deno.test("service: an HTML body for a .json path is refused", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: "<!DOCTYPE html><html></html>", headers: { "content-type": "text/html" } },
  ]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

Deno.test("service: severity is left at the kind default — Manychat is pure SaaS", () => {
  // No self-hosted edition, one API host: a Public API outage really does hit
  // every tenant, so this is NOT the discourse case.
  assertEquals(service.severity, undefined);
  assertEquals(service.kind, "service");
});
