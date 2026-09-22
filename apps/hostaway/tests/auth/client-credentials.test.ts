import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/client-credentials.ts";

Deno.test("client-credentials: collects the numeric account ID and the secret, both masked", () => {
  assertEquals(auth.key, "client-credentials");
  // `custom`: the client_credentials grant has no browser redirect/PKCE, so it is not
  // the `oauth2` type's authorization-code flow.
  assertEquals(auth.type, "custom");
  assertEquals(auth.fields?.map((f) => f.key), ["accountId", "clientSecret"]);
  assertEquals(auth.fields?.[0].label, "Account ID");
  assertEquals(auth.fields?.[0].type, "secret");
  assertEquals(auth.fields?.[1].type, "secret");
});

Deno.test("client-credentials: exchange POSTs the documented form body to /v1/accessTokens", async () => {
  const { ctx, calls } = mockCtx([{
    body: { token_type: "Bearer", expires_in: 15897600, access_token: "jwt" },
  }]);
  const cred = await auth.exchange!(
    { fields: { accountId: "12471", clientSecret: "s3cr3t" } },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://api.hostaway.com/v1/accessTokens");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(
    calls[0].body,
    "grant_type=client_credentials&client_id=12471&client_secret=s3cr3t&scope=general",
  );
  assertEquals(cred.accessToken, "jwt");
  assertEquals(cred.tokenType, "Bearer");
  assertEquals(cred.accountId, "12471");
});

Deno.test("client-credentials: the recorded expiry comes from the LIVE expires_in, not the docs' '24 months'", async () => {
  const { ctx } = mockCtx([{
    body: { token_type: "Bearer", expires_in: 15897600, access_token: "jwt" },
  }]);
  const cred = await auth.exchange!(
    { fields: { accountId: "1", clientSecret: "s" } },
    ctx,
  ) as { expiresAt: string };
  const ttlMs = new Date(cred.expiresAt).getTime() - Date.now();
  const documented = 15_897_600_000;
  // 24 months would be ~63_000_000_000ms; the response's own 184 days must win.
  assert(ttlMs > documented - 120_000, "expires_in was not honoured");
  assert(ttlMs < documented, "must expire before Hostaway's own token does");
});

Deno.test("client-credentials: a zero/absent expires_in does not invent a long life", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "jwt" } }]);
  const cred = await auth.exchange!(
    { fields: { accountId: "1", clientSecret: "s" } },
    ctx,
  ) as { expiresAt: string };
  const ttlMs = new Date(cred.expiresAt).getTime() - Date.now();
  assert(ttlMs <= 0, "no expires_in means no documented life to claim");
});

Deno.test("client-credentials: exchange refuses missing fields without a request", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(() => auth.exchange!({ fields: { accountId: "1" } }, ctx), Error, "required");
  assertThrows(() => auth.exchange!({ fields: {} }, ctx), Error, "required");
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: exchange surfaces the RFC 6749 rejection reason", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      error: "invalid_client",
      error_description: "Client authentication failed",
      message: "Client authentication failed",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(auth.exchange!({ fields: { accountId: "1", clientSecret: "bad" } }, ctx)),
    Error,
    "Client authentication failed",
  );
});

Deno.test("client-credentials: refresh re-mints from the stored account id and secret", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "jwt2", expires_in: 1000 } }]);
  const cred = await auth.refresh!(
    { credential: { accountId: "12471", clientSecret: "s", accessToken: "old" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.hostaway.com/v1/accessTokens");
  assertEquals(cred.accessToken, "jwt2");
});

Deno.test("client-credentials: sign stamps the current token as a bearer frame", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.hostaway.com/v1/listings",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "jwt" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer jwt");
});

Deno.test("client-credentials: test re-runs the exchange and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "jwt", expires_in: 100 } }]);
  const result = await auth.test({ credential: { accountId: "1", clientSecret: "s" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.hostaway.com/v1/accessTokens");
});

Deno.test("client-credentials: test tells the user to reconnect when the credential is incomplete", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing accountId or clientSecret — reconnect",
  });
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: test reports failure without throwing", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "invalid_client" } }]);
  const result = await auth.test({ credential: { accountId: "1", clientSecret: "wrong" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});
