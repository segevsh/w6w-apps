import { assert, assertEquals, assertMatch, assertRejects, assertThrows } from "@std/assert";
import auth from "../../auth/credentials.ts";
import { mockCtx } from "../_helpers.ts";

const FIELDS = {
  region: "us",
  clientId: "cid",
  secretKey: "shh",
  userId: "user-123456",
  apiKey: "key-1",
};
const PARTNER = { body: { access_token: "PT", refresh_token: "R", expires_in: 3600 } };
const USER = { body: { access_token: "UT", token_type: "bearer", expires_in: 86400 } };

// deno-lint-ignore no-explicit-any
const call = (hook: any, input: unknown, ctx: unknown) => hook(input, ctx);

Deno.test("exchange: Basic partner token, then a user token minted with the partner bearer", async () => {
  const { ctx, calls } = mockCtx([PARTNER, USER]);
  const cred = await call(auth.exchange, { fields: FIELDS }, ctx) as Record<string, string>;

  assertEquals(
    calls[0].url,
    "https://platform-us.plaud.ai/developer/api/oauth/partner/access-token",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("cid:shh")}`);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");

  assertEquals(
    calls[1].url,
    "https://platform-us.plaud.ai/developer/api/open/partner/users/access-token",
  );
  assertEquals(calls[1].headers["authorization"], "Bearer PT");
  assertEquals(JSON.parse(calls[1].body!), { user_id: "user-123456", expires_in: 86400 });

  assertEquals(cred.userToken, "UT");
  assertEquals(cred.apiKey, "key-1");
  assert(
    !("partnerToken" in cred) && !JSON.stringify(cred).includes('"PT"'),
    "partner token stored",
  );
  assert(Date.parse(cred.userTokenExpiresAt) > Date.now());
});

Deno.test("exchange: uses the Japan host when selected", async () => {
  const { ctx, calls } = mockCtx([PARTNER, USER]);
  await call(auth.exchange, { fields: { ...FIELDS, region: "jp" } }, ctx);
  assertMatch(calls[0].url, /^https:\/\/platform-jp\.plaud\.ai\//);
});

Deno.test("exchange: a 401 detail body is carried into the error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "CLIENT_NOT_FOUND" } }]);
  const err = await assertRejects(() => call(auth.exchange, { fields: FIELDS }, ctx));
  assertMatch((err as Error).message, /CLIENT_NOT_FOUND/);
});

Deno.test("exchange: a 200 carrying a detail error is still refused", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { detail: "INVALID_SECRET" } }]);
  await assertRejects(() => call(auth.exchange, { fields: FIELDS }, ctx), Error, "INVALID_SECRET");
});

Deno.test("exchange: validates required fields and the 6-120 char user id", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => call(auth.exchange, { fields: { ...FIELDS, secretKey: "" } }, ctx),
    Error,
    "required",
  );
  await assertRejects(
    () => call(auth.exchange, { fields: { ...FIELDS, userId: "abc" } }, ctx),
    Error,
    "6 to 120",
  );
});

Deno.test("refresh: re-mints and keeps the stored keys", async () => {
  const { ctx } = mockCtx([PARTNER, { body: { access_token: "UT2", expires_in: 86400 } }]);
  const next = await call(
    auth.refresh,
    { credential: { ...FIELDS, userToken: "old" } },
    ctx,
  ) as Record<string, string>;
  assertEquals(next.userToken, "UT2");
  assertEquals(next.apiKey, "key-1");
  assertEquals(next.clientId, "cid");
});

const req = (url: string) => ({ url, method: "GET", headers: { accept: "application/json" } });
const CRED = { clientId: "cid", apiKey: "key-1", userToken: "UT" };
const BASE = "https://platform-us.plaud.ai/developer/api";

Deno.test("sign: device and upload endpoints get the user bearer token", async () => {
  for (const path of ["/open/partner/sdk/bind", "/open/partner/files/upload/complete-upload"]) {
    const out = await call(auth.sign, { request: req(BASE + path), credential: CRED }, {}) as {
      headers: Record<string, string>;
    };
    assertEquals(out.headers.authorization, "Bearer UT");
    assertEquals(out.headers["x-client-api-key"], undefined);
  }
});

Deno.test("sign: transcription endpoints get X-Client-Id / X-Client-Api-Key, not a bearer", async () => {
  const out = await call(auth.sign, {
    request: req(BASE + "/open/partner/ai/transcriptions/task_1"),
    credential: CRED,
  }, {}) as { headers: Record<string, string> };
  assertEquals(out.headers["x-client-id"], "cid");
  assertEquals(out.headers["x-client-api-key"], "key-1");
  assertEquals(out.headers.authorization, undefined);
});

Deno.test("sign: transcription without an api key fails loudly", () => {
  assertThrows(
    () =>
      call(auth.sign, {
        request: req(BASE + "/open/partner/ai/transcriptions/"),
        credential: { ...CRED, apiKey: "" },
      }, {}),
    Error,
    "API key",
  );
});

Deno.test("sign: never stamps a host that is not Plaud's", async () => {
  const r = req("https://plaud-bucket.s3.amazonaws.com/part1");
  const out = await call(auth.sign, { request: r, credential: CRED }, {});
  assertEquals(out, r);
});

Deno.test("test: ok when a partner token mints, and says when no api key is set", async () => {
  const ok = mockCtx([PARTNER]);
  const res = await call(
    auth.test,
    { credential: { ...CRED, secretKey: "s", region: "us" } },
    ok.ctx,
  ) as { ok: boolean; message: string };
  assertEquals(res.ok, true);
  assert(!res.message.includes("PT"));
  const bare = mockCtx([PARTNER]);
  const r2 = await call(auth.test, { credential: { clientId: "c", secretKey: "s" } }, bare.ctx) as {
    message: string;
  };
  assertMatch(r2.message, /no transcription API key/);
});

Deno.test("test: a rejected client is a failed test with the vendor's code", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "CLIENT_NOT_FOUND" } }]);
  const res = await call(auth.test, { credential: { clientId: "c", secretKey: "s" } }, ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(res.ok, false);
  assertMatch(res.message, /CLIENT_NOT_FOUND/);
});

Deno.test("afterConnect: exposes the region for actions, never a secret", () => {
  const d = call(auth.afterConnect, {
    credential: { ...CRED, region: "jp", userId: "user-123456", secretKey: "s" },
  }, {}) as Record<string, string>;
  assertEquals(d.region, "jp");
  assertEquals(d.transcription, "enabled");
  assert(!JSON.stringify(d).includes('"s"'));
});
