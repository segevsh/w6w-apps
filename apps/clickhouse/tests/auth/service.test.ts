import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/service.ts";

const cred = {
  host: "abc.eu-west-1.aws.clickhouse.cloud",
  username: "default",
  password: "s3cr3t",
};

const version = {
  status: 200,
  body: JSON.stringify({ data: [{ version: "26.8.1.1653", user: "default" }] }),
  headers: { "content-type": "application/json" },
};

Deno.test("service: signs as HTTP Basic with the database user", () => {
  const request = { url: "https://x:8443/", headers: {} as Record<string, string> };
  const signed = auth.sign!(
    { request, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], `Basic ${btoa("default:s3cr3t")}`);
});

/** SELECT 1 is the smallest statement that proves host, user and password. */
Deno.test("service: tests by running a statement, and reports the server version", async () => {
  const { ctx, calls } = mockCtx([version]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assert(calls[0].body!.startsWith("SELECT version()"), calls[0].body!);
  assertEquals(result.ok, true);
  assert(/26\.8\.1/.test(result.message!), result.message);
  assert(/connected as default/.test(result.message!), result.message);
});

/** The port is 8443 and the console's hostname does not carry it. */
Deno.test("service: adds the port to a bare hostname", async () => {
  const { ctx, calls } = mockCtx([version]);
  await auth.test!({ credential: cred } as never, ctx);
  assertEquals(new URL(calls[0].url).host, "abc.eu-west-1.aws.clickhouse.cloud:8443");
});

/**
 * The IP access list blocks the connection rather than the login, so a
 * failure to reach the host has two very different usual causes.
 */
Deno.test("service: an unreachable host names both the port and the access list", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("timeout")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/8443, not 443/.test(result.message!), result.message);
  assert(/blocks the connection rather than the login/.test(result.message!), result.message);
});

Deno.test("service: a rejected login is reported as the database user, not the API key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: "Code: 516. DB::Exception: default: Authentication failed. (AUTHENTICATION_FAILED)",
    headers: { "x-clickhouse-exception-code": "516" },
  }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/not the organisation API key/.test(result.message!), result.message);
});

Deno.test("service: each missing field is named", async () => {
  for (const missing of ["host", "username", "password"]) {
    const partial = { ...cred, [missing]: "" };
    const { ctx, calls } = mockCtx([]);
    const result = await auth.test!({ credential: partial } as never, ctx);
    assertEquals(result.ok, false);
    assert(new RegExp(missing).test(result.message!), `${missing}: ${result.message}`);
    assertEquals(calls.length, 0);
  }
});

/** An action needs to know which plane this connection reaches. */
Deno.test("service: afterConnect records the normalised host and the plane", () => {
  const display = auth.afterConnect!({ credential: cred }, mockCtx([]).ctx) as Record<
    string,
    unknown
  >;
  assertEquals(display.host, "https://abc.eu-west-1.aws.clickhouse.cloud:8443");
  assertEquals(display.username, "default");
  assertEquals(display.plane, "query");
  assertEquals("password" in display, false, "the password is never public metadata");
});

Deno.test("service: says the port and the access list are the two things that bite", () => {
  assert(/port 8443, not 443/.test(auth.description!), auth.description);
  assert(/IP ACCESS LIST/.test(auth.description!), auth.description);
});
