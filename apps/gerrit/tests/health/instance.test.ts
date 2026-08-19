import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/instance.ts";
import service from "../../health/service.ts";

const D = { display: { host: "https://gerrit.example.com" } };
const PREFIX = ")]}'\n";
const run = (ctx: Parameters<NonNullable<typeof check.check>>[1]) => check.check!({}, ctx);

/** The one place this app deliberately skips /a/. */
Deno.test("instance: probes the bare path, unauthenticated", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: PREFIX + '"3.14.2"' }], D);
  const result = await run(ctx);
  assertEquals(calls[0].url, "https://gerrit.example.com/config/server/version");
  assert(!new URL(calls[0].url).pathname.startsWith("/a/"), "the health check must not use /a/");
  assertEquals(check.credential, "none");
  assertEquals(result.state, "ok");
  assert(/Gerrit 3\.14\.2/.test(result.message!), result.message);
});

/** The absence of the prefix is a more precise signal than a status code. */
Deno.test("instance: no magic prefix means something else answered", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>SSO login</html>" }], D);
  const result = await run(ctx);
  assertEquals(result.state, "degraded");
  assert(/proxy or an SSO login page/.test(result.message!), result.message);
});

Deno.test("instance: a 5xx is down and a 4xx is degraded", async () => {
  const server = mockCtx([{ status: 502, body: "" }], D);
  assertEquals((await run(server.ctx)).state, "down");

  const closed = mockCtx([{ status: 403, body: "" }], D);
  const result = await run(closed.ctx);
  assertEquals(result.state, "degraded");
  assert(/behind an SSO gateway/.test(result.message!), result.message);
});

Deno.test("instance: an unreachable host is down and a missing host is unknown", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
    connection: D,
  } as unknown as Parameters<NonNullable<typeof check.check>>[1];
  assertEquals((await run(ctx)).state, "down");

  const noHost = mockCtx([], { display: {} });
  assertEquals((await run(noHost.ctx)).state, "unknown");
  assertEquals(noHost.calls.length, 0);
});

/** A prefix with an unexpected body shape is still a live Gerrit. */
Deno.test("instance: a prefixed body that will not parse is still ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: PREFIX + "not json" }], D);
  const result = await run(ctx);
  assertEquals(result.state, "ok");
  assert(/version unreported/.test(result.message!), result.message);
});

/** Gerrit is software people run, not a service. */
Deno.test("service: is a declared absence with no vendor to point at", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assert(
    /There is no Gerrit service/.test(service.unavailable!.reason),
    service.unavailable!.reason,
  );
  assert(/apps\/mastodon/.test(service.unavailable!.reason), service.unavailable!.reason);
});
