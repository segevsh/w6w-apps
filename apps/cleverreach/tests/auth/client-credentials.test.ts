import { assert, assertEquals, assertRejects } from "@std/assert";
import auth from "../../auth/client-credentials.ts";
import { mockCtx, unauthorized } from "../_helpers.ts";

const TOKEN = "unitTestFixtureMintedTokenNotReal000";

Deno.test("client-credentials: exchange posts a form to /oauth/token.php and returns the token", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: TOKEN, expires_in: 31536000 } }]);
  const before = Date.now();
  const cred = await auth.exchange!(
    { fields: { clientId: " id1 ", clientSecret: "sec1" } },
    ctx,
  ) as Record<string, string>;
  assertEquals(calls[0].url, "https://rest.cleverreach.com/oauth/token.php");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(
    Object.fromEntries(new URLSearchParams(calls[0].body!)),
    { grant_type: "client_credentials", client_id: "id1", client_secret: "sec1" },
  );
  assertEquals(cred.accessToken, TOKEN);
  assertEquals(cred.clientId, "id1");
  assert(Date.parse(cred.expiresAt) > before + 31535000 * 1000 - 200_000);
});

Deno.test("client-credentials: a short expires_in renews early but never in the past", async () => {
  const { ctx } = mockCtx([{ body: { access_token: TOKEN, expires_in: 90 } }]);
  const before = Date.now();
  const cred = await auth.exchange!(
    { fields: { clientId: "a", clientSecret: "b" } },
    ctx,
  ) as Record<string, string>;
  assert(Date.parse(cred.expiresAt) >= before + 59_000);
});

Deno.test("client-credentials: invalid_client is read from the body, with a hint", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: "invalid_client", error_description: "The client credentials are invalid" },
  }]);
  const err = await assertRejects(async () =>
    await auth.exchange!({ fields: { clientId: "a", clientSecret: "b" } }, ctx)
  );
  assert((err as Error).message.includes("invalid_client: The client credentials are invalid"));
  assert((err as Error).message.includes("pair was rejected"));
});

Deno.test("client-credentials: a 200 carrying an error body is still a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { error: "invalid_client" } }]);
  await assertRejects(
    async () => await auth.exchange!({ fields: { clientId: "a", clientSecret: "b" } }, ctx),
    Error,
    "invalid_client",
  );
});

Deno.test("client-credentials: a body without access_token, or a bare 5xx, is a failure", async () => {
  const one = mockCtx([{ body: {} }]);
  await assertRejects(
    async () => await auth.exchange!({ fields: { clientId: "a", clientSecret: "b" } }, one.ctx),
    Error,
    "no `access_token`",
  );
  const two = mockCtx([{ status: 502, body: "bad gateway" }]);
  await assertRejects(
    async () => await auth.exchange!({ fields: { clientId: "a", clientSecret: "b" } }, two.ctx),
    Error,
    "502",
  );
});

Deno.test("client-credentials: both fields are required, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await auth.exchange!({ fields: { clientId: "a" } }, ctx),
    Error,
    "both required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: refresh re-mints from the stored pair and keeps the rest", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "new", expires_in: 3600 } }]);
  const out = await auth.refresh!(
    { credential: { clientId: "a", clientSecret: "b", accessToken: "old", extra: 1 } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(out.accessToken, "new");
  assertEquals(out.clientSecret, "b");
  assertEquals(out.extra, 1);
  assertEquals(new URLSearchParams(calls[0].body!).get("client_id"), "a");
});

Deno.test("client-credentials: sign stamps the minted token", () => {
  const request = { method: "GET", url: "https://rest.cleverreach.com/v3/groups", headers: {} };
  const signed = auth.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("client-credentials: test probes /v3/debug/ttl with the minted token", async () => {
  const ok = mockCtx([{ body: {} }]);
  assertEquals(await auth.test({ credential: { accessToken: TOKEN } }, ok.ctx), { ok: true });
  assertEquals(ok.calls[0].headers.authorization, `Bearer ${TOKEN}`);
  const bad = mockCtx([{ status: 401, body: unauthorized }]);
  assertEquals((await auth.test({ credential: { accessToken: TOKEN } }, bad.ctx)).ok, false);
});

Deno.test("client-credentials: afterConnect labels the connection by client id only", async () => {
  const meta = await auth.afterConnect!(
    { credential: { clientId: "id1", clientSecret: "s", accessToken: TOKEN } },
    {} as never,
  );
  assertEquals(meta, { clientId: "id1" });
});
