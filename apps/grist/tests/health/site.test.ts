import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check, { parseComponents } from "../../health/site.ts";

const HTML = { "content-type": "text/html; charset=utf-8" };
const conn = (siteUrl: string) => ({ display: { siteUrl } });

Deno.test("site: probes /status?db=1 on the connection's own host, unsigned", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: "Grist server(home) is alive (db ok).", headers: HTML }],
    conn("https://docs.getgrist.com"),
  );
  const report = await check.check!({}, ctx);
  assertEquals(calls[0].url, "https://docs.getgrist.com/status?db=1");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.db.state, "ok");
});

/**
 * The reason `redis=1` is not requested. grist-core's /status handler fails the
 * WHOLE response if any requested sub-check fails, and an unconfigured Redis
 * counts as a failure — so a healthy single-container self-hosted install would
 * be reported as down.
 */
Deno.test("site: asks for db only — never redis", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: "Grist server(home) is alive (db ok).", headers: HTML }],
    conn("https://grist.internal.example"),
  );
  await check.check!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("db"), "1");
  assert(!url.searchParams.has("redis"));
  assert(!url.searchParams.has("docWorkerRegistered"));
  // And never /status/hooks, which is 500 in production by design.
  assertEquals(url.pathname, "/status");
});

Deno.test("site: strips a trailing slash and a pasted /api before appending /status", async () => {
  const { ctx, calls } = mockCtx(
    [
      { body: "Grist server(home) is alive.", headers: HTML },
      { body: "Grist server(home) is alive.", headers: HTML },
    ],
    conn("https://docs.getgrist.com/api/"),
  );
  await check.check!({}, ctx);
  assertEquals(calls[0].url, "https://docs.getgrist.com/status?db=1");
  await check.check!({}, ctx);
  assertEquals(calls[1].url, "https://docs.getgrist.com/status?db=1");
});

Deno.test("site: a 500 'is unhealthy' is down, with the failing component named", async () => {
  const { ctx } = mockCtx(
    [{ status: 500, body: "Grist server(home) is unhealthy (db not ok).", headers: HTML }],
    conn("https://x.example"),
  );
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.db.state, "down");
  assert(report.message!.includes("unhealthy"));
});

Deno.test("site: a 404 means this origin is not a Grist server", async () => {
  const { ctx } = mockCtx(
    [{ status: 404, body: "<!doctype html><html>…", headers: HTML }],
    conn("https://not-grist.example"),
  );
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(/Grist server/i.test(report.message ?? ""));
});

Deno.test("site: an unexpected 4xx is degraded, not down", async () => {
  const { ctx } = mockCtx(
    [{ status: 403, body: "blocked", headers: HTML }],
    conn("https://x.example"),
  );
  assertEquals((await check.check!({}, ctx)).state, "degraded");
});

/** A 200 from something that is not Grist tells us nothing — never claim ok. */
Deno.test("site: a 200 that does not say 'is alive' is unknown", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: "<html>Welcome to nginx</html>", headers: HTML }],
    conn("https://x.example"),
  );
  assertEquals((await check.check!({}, ctx)).state, "unknown");
});

Deno.test("site: no siteUrl on the connection is unknown, and makes no call", async () => {
  const { ctx, calls } = mockCtx([]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(calls.length, 0);
});

Deno.test("site: posture — dependency / connection / context, and it widens no egress", () => {
  assertEquals(check.kind, "dependency");
  assertEquals(check.scope, "connection");
  // `context` is what keeps `sign` from running against an unauthenticated path.
  assertEquals(check.credential, "context");
  assertEquals(check.network, undefined);
  assert(typeof check.check === "function");
});

Deno.test("parseComponents: reads the inline sub-check list", () => {
  assertEquals(parseComponents("Grist server(home) is alive (db ok)."), { db: { state: "ok" } });
  assertEquals(parseComponents("Grist server(home) is alive (db ok, redis ok)."), {
    db: { state: "ok" },
    redis: { state: "ok" },
  });
  assertEquals(parseComponents("Grist server(home) is unhealthy (db ok, redis not ok)."), {
    db: { state: "ok" },
    redis: { state: "down" },
  });
});

Deno.test("parseComponents: reports nothing when nothing was asked for", () => {
  // "we did not ask" must not collapse into "it failed".
  assertEquals(parseComponents("Grist server(home) is alive."), undefined);
  assertEquals(parseComponents(""), undefined);
});

/**
 * The server names itself `server(home)` — a first-match regex would parse
 * `home` as the component list and silently report nothing.
 */
Deno.test("parseComponents: is not fooled by the parentheses in the server's own name", () => {
  assertEquals(parseComponents("Grist server(home) is alive (db ok)."), { db: { state: "ok" } });
  assertEquals(parseComponents("Grist server(doc) is alive (db ok)"), { db: { state: "ok" } });
});
