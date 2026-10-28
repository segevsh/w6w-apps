import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import account from "../../health/account.ts";
import { API_VERSION } from "../../lib/signing.ts";

const display = { account: "myaccount" };

Deno.test("account: lists containers against this connection's own account", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "<EnumerationResults/>" }], { display });
  const result = await account.check!({}, ctx);
  assert(
    calls[0].url.startsWith("https://myaccount.blob.core.windows.net/?comp=list"),
    calls[0].url,
  );
  assertEquals(calls[0].headers["x-ms-version"], API_VERSION);
  assertEquals(result.state, "ok");
  assertEquals(typeof result.latencyMs, "number");
});

/** A storage account is a DNS name. */
Deno.test("account: a name that does not resolve is reported as that, not an outage", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns error")),
    log: () => {},
    connection: { display },
  } as unknown as Parameters<NonNullable<typeof account.check>>[1];
  const result = await account.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/deleted or renamed rather than an Azure outage/.test(result.message!), result.message);
});

/** Azure reports clock drift as a permission error with nothing about time. */
Deno.test("account: an authentication failure names both a rotated key and clock drift", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: "<Error><Code>AuthenticationFailed</Code><Message>no</Message></Error>",
    headers: { "content-type": "application/xml", "x-ms-error-code": "AuthenticationFailed" },
  }], { display });
  const result = await account.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/rotated/.test(result.message!), result.message);
  assert(/15 minutes/.test(result.message!), result.message);
});

Deno.test("account: a 5xx is attributed to Azure rather than the credential", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }], { display });
  const result = await account.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/this one is Azure, not the credential/.test(result.message!), result.message);
});

Deno.test("account: another 4xx is degraded", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: "<Error><Code>InvalidQueryParameterValue</Code><Message>bad</Message></Error>",
    headers: { "content-type": "application/xml", "x-ms-error-code": "InvalidQueryParameterValue" },
  }], { display });
  assertEquals((await account.check!({}, ctx)).state, "degraded");
});

Deno.test("account: a connection with no account recorded is unknown", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const result = await account.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/the account name is the hostname/.test(result.message!), result.message);
});

/** Azure gives no unauthenticated probe, so this one has to be signed. */
Deno.test("account: is signed, and says why it cannot separate the two failures", () => {
  assertEquals(account.credential, "signed");
  assertEquals(account.scope, "connection");
  assertEquals(account.severity, "fatal");
  assert(/offers no unauthenticated probe/.test(account.description!), account.description);
  assertEquals(account.covers, ["dependency", "credential"]);
});
