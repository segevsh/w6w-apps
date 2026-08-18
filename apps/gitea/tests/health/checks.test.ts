import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import instance from "../../health/instance.ts";
import service from "../../health/service.ts";

const conn = { display: { baseUrl: "https://git.example.com" } };

/** For self-hosted software, this is the check that answers the real question. */
Deno.test("instance: probes this connection's own /version, unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { version: "1.27.0" } }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(calls[0].url, "https://git.example.com/api/v1/version");
  assertEquals(report.state, "ok");
  assertEquals(report.message, "Gitea 1.27.0");
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.scope, "connection");
  // Unsigned: an expired token must not make the server look down.
  assertEquals(instance.credential, "context");
});

/** The version is reported because Gitea's API surface moves between releases. */
Deno.test("instance: the version reaches the message, not just the log", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { version: "1.21.11" } }], conn);
  assert((await instance.check!({}, ctx)).message!.includes("1.21.11"));
});

Deno.test("instance: an unreachable server is down", async () => {
  const { ctx } = mockCtx([], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("unreachable"), report.message);
});

/** A 404 here means something answered but it is not a Gitea API. */
Deno.test("instance: a 404 is diagnosed as a wrong URL", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("is the instance URL right?"), report.message);
});

Deno.test("instance: another status is down, and an odd shape is degraded", async () => {
  const bad = mockCtx([{ status: 502, body: "" }], conn);
  assertEquals((await instance.check!({}, bad.ctx)).state, "down");

  const odd = mockCtx([{ status: 200, body: { nope: true } }], conn);
  assertEquals((await instance.check!({}, odd.ctx)).state, "degraded");
});

Deno.test("instance: a connection with no URL is unknown, not down", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("records no instance URL"), report.message);
});

/**
 * Gitea is software, not a service — there is no vendor running your instance,
 * so there is nothing a status page could say about it.
 */
Deno.test("service: is a declared absence, and explains why the question does not apply", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  const reason = service.unavailable!.reason;
  assert(reason.includes("self-hosted"), reason);
  assert(reason.includes("2026-08-18"), reason);
  assert(reason.includes("UptimeRobot"), reason);
});
