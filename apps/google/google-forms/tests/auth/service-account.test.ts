import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { exchangeForAccessToken } from "../../auth/service-account.ts";

/**
 * A throwaway RSA key, generated per test run — the JWT signing path is real
 * (Web Crypto RS256), only the token endpoint is mocked.
 */
async function generatePem(): Promise<string> {
  const pair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  const bytes = new Uint8Array(pkcs8);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin).replace(/(.{64})/g, "$1\n");
  return `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----\n`;
}

Deno.test("service-account: declares a custom JWT method with a secret private key", () => {
  assertEquals(auth.key, "service-account");
  assertEquals(auth.type, "custom");
  const fields = Object.fromEntries((auth.fields ?? []).map((f) => [f.key, f]));
  assertEquals(fields.email.required, true);
  assertEquals(fields.privateKey.type, "secret");
  assertEquals(fields.privateKey.required, true);
  // Domain-wide delegation is optional.
  assertEquals(fields.subject.required, undefined);
});

Deno.test("service-account: exchange posts a JWT-bearer assertion with the forms scopes", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "ya29.mock" } }]);
  const token = await exchangeForAccessToken(
    { email: "sa@p.iam.gserviceaccount.com", privateKey: await generatePem() },
    ctx.fetch,
  );
  assertEquals(token, "ya29.mock");
  assertEquals(calls[0].url, "https://oauth2.googleapis.com/token");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");

  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("grant_type"), "urn:ietf:params:oauth:grant-type:jwt-bearer");
  const [header, claims] = form.get("assertion")!.split(".").slice(0, 2).map((part) =>
    JSON.parse(atob(part.replaceAll("-", "+").replaceAll("_", "/")))
  );
  assertEquals(header, { alg: "RS256", typ: "JWT" });
  assertEquals(claims.iss, "sa@p.iam.gserviceaccount.com");
  assertEquals(claims.aud, "https://oauth2.googleapis.com/token");
  assert(claims.scope.includes("https://www.googleapis.com/auth/forms.body"));
  assert(claims.scope.includes("https://www.googleapis.com/auth/forms.responses.readonly"));
  assertEquals(claims.sub, undefined);
});

Deno.test("service-account: `subject` becomes the JWT `sub` for domain-wide delegation", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "t" } }]);
  await exchangeForAccessToken(
    { email: "sa@p.iam.gserviceaccount.com", privateKey: await generatePem(), subject: "u@x.com" },
    ctx.fetch,
  );
  const assertion = new URLSearchParams(calls[0].body!).get("assertion")!;
  const claims = JSON.parse(
    atob(assertion.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
  );
  assertEquals(claims.sub, "u@x.com");
});

Deno.test("service-account: sign stamps the exchanged token as a Bearer", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "ya29.signed" } }]);
  const request = {
    url: "https://forms.googleapis.com/v1/forms/f1",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({
    request,
    credential: { email: "sa@p.iam.gserviceaccount.com", privateKey: await generatePem() },
  }, ctx);
  assertEquals(out.headers["authorization"], "Bearer ya29.signed");
});

Deno.test("service-account: test rejects an incomplete credential without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { email: "sa@p.iam.gserviceaccount.com" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("privateKey"));
  assertEquals(calls.length, 0);
});

Deno.test("service-account: test surfaces a rejected token exchange", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    statusText: "Bad Request",
    body: '{"error":"invalid_grant"}',
  }]);
  const result = await auth.test({
    credential: { email: "sa@p.iam.gserviceaccount.com", privateKey: await generatePem() },
  }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("400"));
});

Deno.test("service-account: test passes on a successful exchange", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "ya29.ok" } }]);
  const result = await auth.test({
    credential: { email: "sa@p.iam.gserviceaccount.com", privateKey: await generatePem() },
  }, ctx);
  assertEquals(result.ok, true);
});

Deno.test("service-account: an empty PEM fails loudly rather than signing garbage", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    () =>
      exchangeForAccessToken(
        {
          email: "sa@p.iam.gserviceaccount.com",
          privateKey: "-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----",
        },
        ctx.fetch,
      ),
    Error,
    "privateKey is empty",
  );
});

Deno.test("service-account: a 200 without access_token is still an error", async () => {
  const { ctx } = mockCtx([{ body: { token_type: "Bearer" } }]);
  const pem = await generatePem();
  await assertRejects(
    () =>
      exchangeForAccessToken({ email: "sa@p.iam.gserviceaccount.com", privateKey: pem }, ctx.fetch),
    Error,
    "returned no access_token",
  );
});
