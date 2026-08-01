import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/client-credentials.ts";

Deno.test("client-credentials: collects clientId, clientSecret and a sandbox toggle", () => {
  assertEquals(auth.key, "client-credentials");
  // `custom`: the client_credentials grant has no browser redirect/PKCE, so it
  // isn't the `oauth2` type's authorization-code flow.
  assertEquals(auth.type, "custom");
  assertEquals(auth.fields?.map((f) => f.key), ["clientId", "clientSecret", "sandbox"]);
  assertEquals(auth.fields?.[0].type, "secret");
  assertEquals(auth.fields?.[1].type, "secret");
  assertEquals(auth.fields?.[2].type, "boolean");
});

Deno.test("client-credentials: exchange mints a token with the client_credentials grant", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok", expires_in: 32000 } }]);
  const cred = await auth.exchange!(
    { fields: { clientId: "cid", clientSecret: "sec", sandbox: false } },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://api-m.paypal.com/v1/oauth2/token");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("cid:sec")}`);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "grant_type=client_credentials");

  assertEquals(cred.accessToken, "tok");
  assertEquals(cred.clientId, "cid");
  assertEquals(cred.sandbox, false);
  assert(typeof cred.expiresAt === "string");
});

Deno.test("client-credentials: exchange targets the sandbox host when sandbox is checked", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok", expires_in: 32000 } }]);
  await auth.exchange!({ fields: { clientId: "cid", clientSecret: "sec", sandbox: true } }, ctx);
  assertEquals(calls[0].url, "https://api-m.sandbox.paypal.com/v1/oauth2/token");
});

Deno.test("client-credentials: the recorded expiry leaves headroom before PayPal's", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "tok", expires_in: 32000 } }]);
  const cred = await auth.exchange!(
    { fields: { clientId: "c", clientSecret: "s", sandbox: false } },
    ctx,
  ) as { expiresAt: string };
  const ttlMs = new Date(cred.expiresAt).getTime() - Date.now();
  assert(ttlMs < 32000_000, "must expire before PayPal's own token does");
  assert(ttlMs > 31_900_000, "but not so early that it churns");
});

Deno.test("client-credentials: exchange refuses missing fields without a request", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(() => auth.exchange!({ fields: { clientId: "c" } }, ctx), Error, "required");
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: exchange surfaces PayPal's rejection reason", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "invalid_client", error_description: "Client Authentication failed" },
  }]);
  await assertRejects(
    () =>
      Promise.resolve(
        auth.exchange!({ fields: { clientId: "c", clientSecret: "s", sandbox: false } }, ctx),
      ),
    Error,
    "Client Authentication failed",
  );
});

Deno.test("client-credentials: refresh re-mints from the stored client id/secret", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok2", expires_in: 32000 } }]);
  const cred = await auth.refresh!(
    { credential: { clientId: "cid", clientSecret: "sec", sandbox: false, accessToken: "old" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api-m.paypal.com/v1/oauth2/token");
  assertEquals(cred.accessToken, "tok2");
});

Deno.test("client-credentials: sign stamps the current token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api-m.paypal.com/v2/checkout/orders/1",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("client-credentials: test re-runs the exchange and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok", expires_in: 32000 } }]);
  const result = await auth.test(
    { credential: { clientId: "c", clientSecret: "s", sandbox: false } },
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls.length, 1);
});

Deno.test("client-credentials: test tells the user to reconnect when credentials are missing", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing clientId or clientSecret — reconnect",
  });
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: test reports failure without throwing", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "invalid_client" } }]);
  const result = await auth.test({ credential: { clientId: "c", clientSecret: "wrong" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});

Deno.test("client-credentials: afterConnect records the environment on the connection", () => {
  const out = auth.afterConnect!({ credential: { sandbox: true } }, {} as never);
  assertEquals(out, { sandbox: true, environment: "Sandbox" });
  const outLive = auth.afterConnect!({ credential: { sandbox: false } }, {} as never);
  assertEquals(outLive, { sandbox: false, environment: "Live" });
});
