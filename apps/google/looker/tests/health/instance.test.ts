import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/instance.ts";
import service from "../../health/service.ts";

const D = { display: { host: "https://mycompany.cloud.looker.com" } };
const run = (ctx: Parameters<NonNullable<typeof check.check>>[1]) => check.check!({}, ctx);

Deno.test("instance: an answering Looker is ok, and names the user", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "42", display_name: "Workflow Bot" },
  }], D);
  const result = await run(ctx);
  assertEquals(calls[0].url, "https://mycompany.cloud.looker.com/api/4.0/user");
  assertEquals(result.state, "ok");
  assert(/Workflow Bot/.test(result.message!), result.message);
  assertEquals(typeof result.latencyMs, "number");
});

/** The commonest self-hosted mistake presents as an outage. */
Deno.test("instance: a connection failure names port 19999", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("connection refused")),
    log: () => {},
    connection: { display: { host: "https://looker.internal:19999" } },
  } as unknown as Parameters<NonNullable<typeof check.check>>[1];
  const result = await run(ctx);
  assertEquals(result.state, "down");
  assert(/port 19999/.test(result.message!), result.message);
});

/** A token lasts an hour, so a 401 is usually a missed refresh. */
Deno.test("instance: a 401 says a missed refresh before it says a revocation", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Not authenticated" } }], D);
  const result = await run(ctx);
  assertEquals(result.state, "down");
  assert(/refresh that did not happen/.test(result.message!), result.message);
});

/** A disabled user gets a token and every query is refused. */
Deno.test("instance: a disabled Looker user is down, not ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "42", is_disabled: true } }], D);
  const result = await run(ctx);
  assertEquals(result.state, "down");
  assert(/DISABLED/.test(result.message!), result.message);
});

/** A browser URL reaches the web interface, which answers HTML. */
Deno.test("instance: a non-JSON body reads as the wrong port rather than an outage", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>Looker</html>" }], D);
  const result = await run(ctx);
  assertEquals(result.state, "degraded");
  assert(/port 19999/.test(result.message!), result.message);
});

Deno.test("instance: a 5xx is down and a 4xx is degraded", async () => {
  const server = mockCtx([{ status: 503, body: { message: "unavailable" } }], D);
  assertEquals((await run(server.ctx)).state, "down");
  const client = mockCtx([{ status: 404, body: { message: "no" } }], D);
  assertEquals((await run(client.ctx)).state, "degraded");
});

/** Without a recorded instance there is nothing to reach. */
Deno.test("instance: no recorded host is unknown, not down", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  const result = await run(ctx);
  assertEquals(result.state, "unknown");
  assertEquals(calls.length, 0);
});

Deno.test("instance: is connection-scoped, signed and fatal", () => {
  assertEquals(check.scope, "connection");
  assertEquals(check.credential, "signed");
  assertEquals(check.severity, "fatal");
  assertEquals(check.covers, ["dependency", "credential"]);
  assertEquals(check.network!.allow, ["*"]);
});

/**
 * There is no Looker service to have a status — every deployment is its own
 * instance, and the warehouse underneath is not covered by any status page.
 */
Deno.test("service: is a declared absence with a reason, and makes no request", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.scope, "app");
  assertEquals(service.severity, "informational");
  assert(/own instance/.test(service.unavailable!.reason), service.unavailable!.reason);
  assert(/warehouse/.test(service.unavailable!.reason), service.unavailable!.reason);
});
