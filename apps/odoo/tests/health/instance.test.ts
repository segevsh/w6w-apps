import { assert, assertEquals } from "@std/assert";
import check from "../../health/instance.ts";
import { mockCtx, TEST_DATABASE, TEST_INSTANCE } from "../_helpers.ts";

Deno.test("instance: is an unsigned, per-connection dependency probe", () => {
  assertEquals(check.kind, "dependency");
  assertEquals(check.scope, "connection");
  assertEquals(check.credential, "context");
  assertEquals(check.network, undefined);
});

Deno.test("instance: calls the UNAUTHENTICATED common.version on this connection's host", async () => {
  const { ctx, calls } = mockCtx([{ result: { server_version: "saas~19.3+e" } }]);
  const report = await check.check!({}, ctx);

  assertEquals(calls[0].url, `${TEST_INSTANCE}/jsonrpc`);
  assertEquals(calls[0].headers["x-odoo-database"], TEST_DATABASE);
  const params = JSON.parse(calls[0].body!).params;
  assertEquals(params.service, "common");
  assertEquals(params.method, "version");
  // Nothing credential-shaped may appear on an unsigned probe.
  assertEquals(params.args, []);
  assertEquals(calls[0].headers["authorization"], undefined);

  assertEquals(report.state, "ok");
  assert(/saas~19\.3/.test(report.message ?? ""));
});

Deno.test("instance: reports unknown — not down — when the connection names no host", async () => {
  // Nothing was learned about the instance, so claiming it is down would lie.
  const { ctx, calls } = mockCtx([], { display: {} });
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(calls.length, 0);
});

Deno.test("instance: reports down when the host is unreachable", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns failure")),
    log: () => {},
    connection: { display: { instanceUrl: TEST_INSTANCE, database: TEST_DATABASE } },
  } as never;
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(/dns failure/.test(report.message ?? ""));
});

Deno.test("instance: reports down on a 5xx", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "gateway down" }]);
  assertEquals((await check.check!({}, ctx)).state, "down");
});

Deno.test("instance: reports down when /jsonrpc is disabled or a proxy answers HTML", async () => {
  // A 200 carrying a login page is the classic "Odoo is behind something" case.
  const { ctx } = mockCtx([
    {
      status: 200,
      headers: { "content-type": "text/html" },
      body: "<!DOCTYPE html><title>Login</title>",
    },
  ]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(/non-JSON/.test(report.message ?? ""));
});

Deno.test("instance: reports down when the named database is not served", async () => {
  const { ctx } = mockCtx([{
    error: { data: { name: "werkzeug.exceptions.NotFound", message: "database not found" } },
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(/NotFound/.test(report.message ?? ""));
});
