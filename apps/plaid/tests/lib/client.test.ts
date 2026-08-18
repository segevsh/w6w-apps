import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { describeError, hostFor, HOSTS, PlaidClient, plaidDate } from "../../lib/client.ts";

const sandbox = { display: { environment: "sandbox" } };
const production = { display: { environment: "production" } };

/** `development` was retired — verified, it does not resolve. */
Deno.test("hostFor: only sandbox and production exist", () => {
  assertEquals(hostFor("sandbox"), "https://sandbox.plaid.com");
  assertEquals(hostFor("production"), "https://production.plaid.com");
  assertEquals(hostFor(undefined), "https://sandbox.plaid.com");
  assertEquals(Object.keys(HOSTS), ["sandbox", "production"]);
  assert(!("development" in HOSTS));
});

Deno.test("client: every call is a POST with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { accounts: [] } }], sandbox);
  await new PlaidClient(ctx).request("/accounts/get", { access_token: "tok" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { access_token: "tok" });
});

Deno.test("client: the connection's environment decides the host", async () => {
  const s = mockCtx([{ status: 200, body: {} }], sandbox);
  await new PlaidClient(s.ctx).request("/item/get");
  assertEquals(new URL(s.calls[0].url).host, "sandbox.plaid.com");

  const p = mockCtx([{ status: 200, body: {} }], production);
  await new PlaidClient(p.ctx).request("/item/get");
  assertEquals(new URL(p.calls[0].url).host, "production.plaid.com");
});

/** Actions never see the credential — the sign hook adds it. */
Deno.test("client: never puts credentials in the body itself", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], sandbox);
  await new PlaidClient(ctx).request("/accounts/get", { access_token: "tok" });
  const sent = JSON.parse(calls[0].body!);
  assertEquals("client_id" in sent, false);
  assertEquals("secret" in sent, false);
});

/** Retrying this one never helps, and treating it as transient breaks syncs. */
Deno.test("describeError: ITEM_LOGIN_REQUIRED explains that retrying will not help", () => {
  const message = describeError(JSON.stringify({
    error_type: "ITEM_ERROR",
    error_code: "ITEM_LOGIN_REQUIRED",
    error_message: "the login details of this item have changed",
    request_id: "req1",
  }));
  assert(/retrying will not help/.test(message), message);
  assert(/Plaid Link/.test(message), message);
  assert(/req1/.test(message), message);
});

Deno.test("describeError: keeps the code, the suggestion and the doc link", () => {
  const message = describeError(JSON.stringify({
    error_code: "INVALID_FIELD",
    error_message: "client_id must be a properly formatted, non-empty string",
    suggested_action: "Check the client_id",
    documentation_url: "https://plaid.com/docs/errors/",
  }));
  assert(message.includes("INVALID_FIELD"), message);
  assert(message.includes("Suggested: Check the client_id"), message);
  assert(message.includes("plaid.com/docs/errors"), message);
});

Deno.test("client: a failure carries the path and the decoded error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error_code: "INVALID_ACCESS_TOKEN", error_message: "bad token" },
  }], sandbox);
  const err = await assertRejects(
    async () => await new PlaidClient(ctx).request("/accounts/get", {}),
  );
  assert(String(err).includes("/accounts/get"), String(err));
  assert(String(err).includes("INVALID_ACCESS_TOKEN"), String(err));
});

Deno.test("plaidDate: accepts a date, truncates a timestamp, rejects rubbish", () => {
  assertEquals(plaidDate("2026-08-18", "start"), "2026-08-18");
  assertEquals(plaidDate("2026-08-18T10:00:00Z", "start"), "2026-08-18");
  assertEquals(plaidDate("", "start"), undefined);
  assertThrows(() => plaidDate("last week", "startDate"), Error, "startDate");
});
