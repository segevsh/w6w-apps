import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import jwtBearer from "../../auth/jwt-bearer.ts";
import { OAUTH_TOKEN_URL, WHOAMI_PATH } from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const FIELDS = { jwtToken: "eyJ.jwt.credential", clientId: "cid", clientSecret: "csecret" };

Deno.test("jwt-bearer: is a custom-type method with three secret fields", () => {
  assertEquals(jwtBearer.type, "custom");
  assertEquals(
    (jwtBearer.fields ?? []).map((f) => f.key).sort(),
    ["clientId", "clientSecret", "jwtToken"],
  );
  for (const f of jwtBearer.fields ?? []) assertEquals(f.type, "secret", f.key);
});

Deno.test("jwt-bearer: exchange posts the jwt-bearer grant with Basic client auth", async () => {
  const { ctx, calls } = mockCtx([
    { body: { access_token: "tok-1", expires_in: 7199, token_type: "Bearer" } },
  ]);
  const credential = await jwtBearer.exchange!({ fields: FIELDS }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].url, OAUTH_TOKEN_URL);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers.authorization, `Basic ${btoa("cid:csecret")}`);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(
    calls[0].body,
    "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=eyJ.jwt.credential",
  );
  assertEquals(credential.accessToken, "tok-1");
  assertEquals(credential.jwtToken, "eyJ.jwt.credential");
  assert(typeof credential.expiresAt === "string");
});

Deno.test("jwt-bearer: exchange requires all three fields before making a request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => jwtBearer.exchange!({ fields: { jwtToken: "x" } }, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("jwt-bearer: exchange throws with the vendor's own error_description on failure", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: { error: "invalid_grant", error_description: "JWT is expired" } },
  ]);
  await assertRejects(
    () => Promise.resolve(jwtBearer.exchange!({ fields: FIELDS }, ctx)),
    Error,
    "JWT is expired",
  );
});

Deno.test("jwt-bearer: refresh re-mints from the stored jwtToken, not a refresh_token", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok-2", expires_in: 7199 } }]);
  const credential = await jwtBearer.refresh!(
    { credential: { ...FIELDS, accessToken: "old" } },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].url, OAUTH_TOKEN_URL);
  assertEquals(new URLSearchParams(calls[0].body ?? "").get("assertion"), FIELDS.jwtToken);
  assertEquals(credential.accessToken, "tok-2");
});

Deno.test("jwt-bearer: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://platform.ringcentral.com/x",
    headers: {} as Record<string, string>,
  };
  const signed = jwtBearer.sign!({ request, credential: { accessToken: "tok" } }, {} as never) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, "Bearer tok");
});

Deno.test("jwt-bearer: test passes when the whoami answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", name: "Bot User" } }]);
  const result = await jwtBearer.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), WHOAMI_PATH);
});

Deno.test("jwt-bearer: test rejects a bad token distinctly", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("TokenInvalid", "OAuth token is invalid") },
  ]);
  const result = await jwtBearer.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("jwt-bearer: afterConnect publishes name/extensionNumber/accountId only", async () => {
  const { ctx } = mockCtx([
    { body: { id: "1", name: "Bot User", extensionNumber: "1001", account: { id: "42" } } },
  ]);
  const display = await jwtBearer.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(display, { name: "Bot User", extensionNumber: "1001", accountId: "42" });
});
