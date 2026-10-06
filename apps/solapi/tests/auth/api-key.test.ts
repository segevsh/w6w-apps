import { assert, assertEquals, assertMatch } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiKey, { buildAuthorization, isoDate, makeSalt, PROBE_PATH } from "../../auth/api-key.ts";
import { errBody, mockCtx } from "../_helpers.ts";

const cred = { apiKey: "NCSAYU7II8WUDJOI", apiSecret: "SECRETSECRETSECRETSECRET12345678" };
const DATE = "2026-10-06T09:30:00Z";
const SALT = "saltsaltsaltsaltsaltsaltsaltsalt";
// hex(HMAC-SHA256(key = apiSecret, message = DATE + SALT)), computed independently with Python's hmac.
const SIG = "4f7f0554a2bf1b7be0e1e5d35eeb4e25190236cf6a8f9a55269597c57b876314";

// deno-lint-ignore no-explicit-any
const test = (c: unknown, ctx: HookContext) => (apiKey.test as any)({ credential: c }, ctx);

Deno.test("auth: declares one custom method with two secret fields", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "custom");
  assertEquals(apiKey.fields?.map((f) => [f.key, f.type]), [["apiKey", "secret"], [
    "apiSecret",
    "secret",
  ]]);
  assertEquals(PROBE_PATH, "/cash/v1/balance");
});

Deno.test("auth: the Authorization value matches an independently computed HMAC-SHA256", async () => {
  assertEquals(
    await buildAuthorization(cred, DATE, SALT),
    `HMAC-SHA256 apiKey=NCSAYU7II8WUDJOI, date=${DATE}, salt=${SALT}, signature=${SIG}`,
  );
});

Deno.test("auth.sign: stamps a fresh signed header and never the secret", async () => {
  const req = { url: "https://api.solapi.com/cash/v1/balance", method: "GET", headers: {} };
  const out = await apiKey.sign!({ request: req, credential: cred } as never, mockCtx().ctx) as {
    headers: Record<string, string>;
  };
  const h = out.headers["authorization"];
  assertMatch(
    h,
    /^HMAC-SHA256 apiKey=NCSAYU7II8WUDJOI, date=\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ, salt=[0-9A-Za-z]{32}, signature=[0-9a-f]{64}$/,
  );
  assert(!h.includes(cred.apiSecret));
  // Re-derive the signature from the date and salt the header itself carries.
  const m = h.match(/date=([^,]+), salt=([^,]+), signature=([0-9a-f]+)$/)!;
  assertEquals(await buildAuthorization(cred, m[1], m[2]), h);
});

Deno.test("auth: salts differ between calls and isoDate drops milliseconds", () => {
  assert(makeSalt() !== makeSalt());
  assertEquals(isoDate(new Date("2026-10-06T09:30:00.789Z")), DATE);
});

Deno.test("auth.test: a numeric balance passes; the secret is never in the URL or headers", async () => {
  const { ctx, calls } = mockCtx([{ body: { accountId: "AC1", balance: 100, point: 0 } }]);
  assertEquals(await test(cred, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.solapi.com/cash/v1/balance");
  assertMatch(calls[0].headers["authorization"], /^HMAC-SHA256 apiKey=NCSAYU7II8WUDJOI, /);
  assert(!calls[0].url.includes(cred.apiSecret));
  assert(!calls[0].headers["authorization"].includes(cred.apiSecret));
});

Deno.test("auth.test: a missing half fails without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test({ apiKey: "k" }, ctx)).ok, false);
  assertEquals((await test({ apiSecret: "s" }, ctx)).ok, false);
  assertEquals((await test(undefined, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth.test: 401 and 400 error bodies are rejections quoting the vendor's text", async () => {
  const a = await test(
    cred,
    mockCtx([{ status: 401, body: errBody("Unauthorized", "권한이 없습니다.") }]).ctx,
  );
  assertEquals(a.ok, false);
  assert(a.message.includes("Unauthorized"), a.message);
  const b = await test(
    cred,
    mockCtx([{
      status: 400,
      body: errBody("ValidationError", 'child "apiKey" fails because ["apiKey" length must be 16'),
    }]).ctx,
  );
  assertEquals(b.ok, false);
  assert(b.message.includes("ValidationError"), b.message);
});

Deno.test("auth.test: a 200 without a numeric balance and a 5xx are not judged valid", async () => {
  const odd = await test(cred, mockCtx([{ body: { hello: "world" } }]).ctx);
  assertEquals(odd.ok, false);
  assert(odd.message.includes("not judged"), odd.message);
  const five = await test(
    cred,
    mockCtx([{ status: 503, body: errBody("Unavailable", "later") }]).ctx,
  );
  assertEquals(five.ok, false);
  assert(five.message.includes("503"), five.message);
});
