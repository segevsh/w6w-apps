import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

const req = () => ({
  url: "https://googleads.googleapis.com/v25/customers:listAccessibleCustomers",
  method: "GET" as const,
  headers: {} as Record<string, string>,
});

Deno.test("oauth2: declares the Google endpoints and the single adwords scope", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(auth.oauth2?.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2?.refreshUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2?.revokeUrl, "https://oauth2.googleapis.com/revoke");
  // Google documents exactly one scope for the Google Ads API — there is no
  // read-only variant.
  assertEquals(auth.oauth2?.scopes, ["https://www.googleapis.com/auth/adwords"]);
  assertEquals(auth.oauth2?.extraAuthParams?.access_type, "offline");
  assertEquals(auth.oauth2?.extraAuthParams?.prompt, "consent");
  assertEquals(auth.oauth2?.pkce, true);
});

Deno.test("oauth2: collects the developer token as a required secret field", () => {
  const fields = auth.fields ?? [];
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
  assertEquals(byKey.developerToken.type, "secret");
  assertEquals(byKey.developerToken.required, true);
  assertEquals(byKey.customerId.required, true);
  // The manager id is optional: a non-manager credential must not send the
  // header at all.
  assert(!byKey.loginCustomerId.required);
});

Deno.test("oauth2: sign attaches the bearer AND the developer-token header", async () => {
  const { ctx } = mockCtx();
  const out = await auth.sign!({
    request: req(),
    credential: { accessToken: "acc-123", developerToken: "dev-xyz" },
  }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
  assertEquals(out.headers["developer-token"], "dev-xyz");
});

Deno.test("oauth2: sign omits login-customer-id when none was supplied", async () => {
  const { ctx } = mockCtx();
  const out = await auth.sign!({
    request: req(),
    credential: { accessToken: "acc", developerToken: "dev" },
  }, ctx);
  // Google's docs are explicit: a credential belonging to a user of the target
  // account directly must not send this header. Absent is not the same as empty.
  assert(!("login-customer-id" in out.headers));
});

Deno.test("oauth2: sign sends login-customer-id only when supplied, normalized", async () => {
  const { ctx } = mockCtx();
  const out = await auth.sign!({
    request: req(),
    credential: { accessToken: "acc", developerToken: "dev", loginCustomerId: "123-456-7890" },
  }, ctx);
  assertEquals(out.headers["login-customer-id"], "1234567890");
});

Deno.test("oauth2: sign treats an empty login-customer-id as absent", async () => {
  const { ctx } = mockCtx();
  const out = await auth.sign!({
    request: req(),
    credential: { accessToken: "acc", developerToken: "dev", loginCustomerId: "" },
  }, ctx);
  assert(!("login-customer-id" in out.headers));
});

Deno.test("oauth2: sign makes no network call", async () => {
  const { ctx, calls } = mockCtx();
  await auth.sign!({
    request: req(),
    credential: { accessToken: "acc", developerToken: "dev", loginCustomerId: "1234567890" },
  }, ctx);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test reports a missing accessToken without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test reports a missing developerToken without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { accessToken: "acc" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("developerToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test probes listAccessibleCustomers with both credentials", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { resourceNames: ["customers/1"] } }]);
  const result = await auth.test({
    credential: { accessToken: "acc-abc", developerToken: "dev-xyz" },
  }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "googleads.googleapis.com");
  assertEquals(url.pathname, "/v25/customers:listAccessibleCustomers");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
  assertEquals(calls[0].headers["developer-token"], "dev-xyz");
  assert(!("login-customer-id" in calls[0].headers));
});

Deno.test("oauth2: test forwards login-customer-id for a manager credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { resourceNames: [] } }]);
  await auth.test({
    credential: { accessToken: "a", developerToken: "d", loginCustomerId: "999-888-7777" },
  }, ctx);
  assertEquals(calls[0].headers["login-customer-id"], "9998887777");
});

Deno.test("oauth2: test treats an account with nothing accessible as healthy", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { resourceNames: [] } }]);
  assertEquals(
    (await auth.test({ credential: { accessToken: "a", developerToken: "d" } }, ctx)).ok,
    true,
  );
});

Deno.test("oauth2: test surfaces the upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "bad", developerToken: "d" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("afterConnect: records the customer id and labels it from a GAQL read", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      results: [{
        customer: {
          descriptiveName: "Acme Ads",
          currencyCode: "USD",
          timeZone: "America/New_York",
          manager: false,
          testAccount: true,
        },
      }],
    },
  }]);
  const display = await auth.afterConnect!({
    credential: {
      accessToken: "acc",
      developerToken: "dev",
      customerId: "123-456-7890",
      loginCustomerId: "999-888-7777",
    },
  }, ctx);

  assertEquals(display.customerId, "1234567890");
  assertEquals(display.loginCustomerId, "9998887777");
  assertEquals(display.descriptiveName, "Acme Ads");
  assertEquals(display.currencyCode, "USD");
  assertEquals(display.testAccount, true);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v25/customers/1234567890/googleAds:search");
  assertEquals(calls[0].headers["developer-token"], "dev");
  assertEquals(calls[0].headers["login-customer-id"], "9998887777");
  assert(JSON.parse(calls[0].body!).query.startsWith("SELECT customer.id"));
});

Deno.test("afterConnect: a failed label lookup still yields a usable connection", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  const display = await auth.afterConnect!({
    credential: { accessToken: "acc", developerToken: "dev", customerId: "1234567890" },
  }, ctx);
  assertEquals(display, { customerId: "1234567890" });
});

Deno.test("afterConnect: with no customerId there is nothing to record", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "acc" } }, ctx), {});
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: skips the lookup when a credential piece is missing", async () => {
  const { ctx, calls } = mockCtx();
  const display = await auth.afterConnect!({ credential: { customerId: "123-456-7890" } }, ctx);
  assertEquals(display, { customerId: "1234567890" });
  assertEquals(calls.length, 0);
});
