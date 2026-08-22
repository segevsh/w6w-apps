import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/service-account.ts";
import { TEST_CLIENT_EMAIL, TEST_PRIVATE_KEY } from "../lib/_vector.ts";

const fields = { clientEmail: TEST_CLIENT_EMAIL, privateKey: TEST_PRIVATE_KEY };
const token = { status: 200, body: { access_token: "ya29.test", expires_in: 3600 } };

/** The JWT-bearer grant: an assertion, not a client id and secret. */
Deno.test("service-account: exchanges a signed JWT assertion for a token", async () => {
  const { ctx, calls } = mockCtx([token]);
  const credential = await auth.exchange!({ fields }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://oauth2.googleapis.com/token");
  assertEquals(calls[0].method, "POST");

  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("grant_type"), "urn:ietf:params:oauth:grant-type:jwt-bearer");
  const assertion = body.get("assertion")!;
  assertEquals(assertion.split(".").length, 3, "a JWT is three segments");
  assertEquals(credential.accessToken, "ya29.test");
});

Deno.test("service-account: the assertion claims the right issuer, audience and scope", async () => {
  const { ctx, calls } = mockCtx([token]);
  await auth.exchange!({ fields }, ctx);
  const assertion = new URLSearchParams(calls[0].body!).get("assertion")!;
  const [header, claims] = assertion.split(".").slice(0, 2).map((segment) =>
    JSON.parse(atob(segment.replaceAll("-", "+").replaceAll("_", "/")))
  );
  assertEquals(header.alg, "RS256");
  assertEquals(claims.iss, TEST_CLIENT_EMAIL);
  assertEquals(claims.aud, "https://oauth2.googleapis.com/token");
  assertEquals(claims.scope, "https://www.googleapis.com/auth/devstorage.full_control");
  assertEquals(claims.exp - claims.iat, 3600);
});

/** Signed URLs need the account named, so the key is kept rather than dropped. */
Deno.test("service-account: keeps the key and email alongside the token", async () => {
  const { ctx } = mockCtx([token]);
  const credential = await auth.exchange!({ fields }, ctx) as Record<string, unknown>;
  assertEquals(credential.clientEmail, TEST_CLIENT_EMAIL);
  assertEquals(credential.privateKey, TEST_PRIVATE_KEY);
  const ttl = new Date(String(credential.expiresAt)).getTime() - Date.now();
  assert(ttl > 0 && ttl < 3600_000, `expiry ${ttl}ms is not inside the hour`);
});

Deno.test("service-account: refresh mints the same way from the stored key", async () => {
  const { ctx, calls } = mockCtx([token]);
  const credential = await auth.refresh!({ credential: fields }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://oauth2.googleapis.com/token");
  assertEquals(credential.accessToken, "ya29.test");
});

Deno.test("service-account: a rejected assertion surfaces Google's description", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: "invalid_grant", error_description: "Invalid JWT Signature." },
  }]);
  let message = "";
  try {
    await auth.exchange!({ fields }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/Invalid JWT Signature/.test(message), message);
});

Deno.test("service-account: exchange refuses without both values", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await auth.exchange!({ fields: { clientEmail: "x" } }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/both required/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("service-account: signs as a bearer", () => {
  const request = {
    url: "https://storage.googleapis.com/storage/v1/b",
    headers: {} as Record<string, string>,
  };
  const signed = auth.sign!(
    { request, credential: { accessToken: "ya29.test" } } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer ya29.test");
  assertEquals(auth.type, "custom");
});

/** Without a project there is nothing to list, so the test says so. */
Deno.test("service-account: with no project, the test proves the token and says what it did not check", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!(
    { credential: { accessToken: "ya29.test", clientEmail: TEST_CLIENT_EMAIL } } as never,
    ctx,
  );
  assertEquals(result.ok, true);
  assert(/bucket access has not been checked/.test(result.message!), result.message);
  assertEquals(calls.length, 0);
});

Deno.test("service-account: with a project, it lists buckets", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [{ name: "b" }] } }]);
  const result = await auth.test!(
    {
      credential: { accessToken: "ya29.test", clientEmail: TEST_CLIENT_EMAIL, projectId: "p1" },
    } as never,
    ctx,
  );
  assert(calls[0].url.includes("project=p1"), calls[0].url);
  assertEquals(result.ok, true);
  assert(/buckets are visible in p1/.test(result.message!), result.message);
});

/** Creating a key grants nothing — this is the state that follows. */
Deno.test("service-account: no visible buckets is reported as possibly a missing role", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { items: [] } }]);
  const result = await auth.test!(
    {
      credential: { accessToken: "ya29.test", clientEmail: TEST_CLIENT_EMAIL, projectId: "p1" },
    } as never,
    ctx,
  );
  assertEquals(result.ok, true);
  assert(/creating a key grants nothing by itself/.test(result.message!), result.message);
});

Deno.test("service-account: a missing token or a rejection fails cleanly", async () => {
  const none = mockCtx([]);
  assertEquals((await auth.test!({ credential: {} } as never, none.ctx)).ok, false);

  const forbidden = mockCtx([{ status: 403, body: { error: { message: "no" } } }]);
  const result = await auth.test!(
    { credential: { accessToken: "x", projectId: "p1" } } as never,
    forbidden.ctx,
  );
  assertEquals(result.ok, false);
  assert(/grants nothing by itself/.test(result.message!), result.message);
});

/** The email is public metadata, and object-signed-url needs it. */
Deno.test("service-account: afterConnect records the account address", () => {
  const display = auth.afterConnect!(
    { credential: { clientEmail: TEST_CLIENT_EMAIL, projectId: "p1", privateKey: "secret" } },
    mockCtx([]).ctx,
  ) as Record<string, unknown>;
  assertEquals(display.clientEmail, TEST_CLIENT_EMAIL);
  assertEquals(display.projectId, "p1");
  assertEquals("privateKey" in display, false, "the key is never public metadata");
});

Deno.test("service-account: says creating the key grants nothing", () => {
  assert(/Creating the key grants NOTHING/.test(auth.description!), auth.description);
  assertEquals(auth.fields!.find((f) => f.key === "privateKey")!.type, "secret");
});
