import { assert, assertEquals } from "@std/assert";
import secretKey, { authHeaders, keyMode, PROBE_PATH } from "../../auth/secret-key.ts";
import { errorBody, mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

const KEY = "sk_test_unitTestFixtureNotARealKey000000";

Deno.test("secret-key: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://api.paystack.co/transaction",
    headers: {} as Record<string, string>,
  };
  const signed = secretKey.sign!({ request, credential: { secretKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  assertEquals(signed.url, "https://api.paystack.co/transaction");
  assertEquals(authHeaders({ secretKey: KEY }), { authorization: `Bearer ${KEY}` });
});

Deno.test("secret-key: declared as a bearer method with one secret field", () => {
  assertEquals(secretKey.type, "bearer");
  assertEquals(secretKey.key, "secret-key");
  assertEquals(secretKey.fields?.map((f) => [f.key, f.type]), [["secretKey", "secret"]]);
  assertEquals(PROBE_PATH, "/transaction");
});

Deno.test("secret-key: test passes on a 200 envelope and probes /transaction?perPage=1", async () => {
  const { ctx, calls } = mockCtx([{ body: ok([], { total: 0 }) }]);
  assertEquals(await secretKey.test({ credential: { secretKey: KEY } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/transaction");
  assertEquals(queryOf(calls[0].url), { perPage: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("secret-key: a missing key or a public key fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const none = await secretKey.test({ credential: {} }, ctx);
  assertEquals(none.ok, false);
  const pub = await secretKey.test({ credential: { secretKey: "pk_test_abc" } }, ctx);
  assertEquals(pub.ok, false);
  assert(pub.message!.includes("public key"));
  assertEquals(calls.length, 0);
});

Deno.test("secret-key: classifies a rejection from the body's code, not the status", async () => {
  // 401 with the vendor's invalid_Key code -> rejected key.
  const a = mockCtx([{ status: 401, body: errorBody("Invalid key") }]);
  const r1 = await secretKey.test({ credential: { secretKey: KEY } }, a.ctx);
  assertEquals(r1.ok, false);
  assert(r1.message!.includes("rejected the secret key"));

  // The SAME status with a different body is not called a bad key.
  const b = mockCtx([{
    status: 401,
    body: errorBody("Merchant suspended", "api_error", "api_error"),
  }]);
  const r2 = await secretKey.test({ credential: { secretKey: KEY } }, b.ctx);
  assertEquals(r2.ok, false);
  assert(r2.message!.includes("Merchant suspended"));
  assert(!r2.message!.includes("rejected the secret key"));

  // A 403 carrying invalid_Key is still a bad key.
  const c = mockCtx([{ status: 403, body: errorBody("No Authorization Header was found") }]);
  assert(
    (await secretKey.test({ credential: { secretKey: KEY } }, c.ctx)).message!.includes("rejected"),
  );
});

Deno.test("secret-key: an unrecognised failure reports the status", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "bad gateway" }]);
  const result = await secretKey.test({ credential: { secretKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("HTTP 502"));
});

Deno.test("secret-key: afterConnect labels the mode from the key prefix, with no request", () => {
  assertEquals(keyMode("sk_test_x"), "test");
  assertEquals(keyMode("sk_live_x"), "live");
  assertEquals(keyMode("nope"), undefined);
  assertEquals(
    secretKey.afterConnect!({ credential: { secretKey: "sk_live_abc" } } as never, {} as never),
    { mode: "live" },
  );
  assertEquals(
    secretKey.afterConnect!({ credential: { secretKey: "weird" } } as never, {} as never),
    {},
  );
});
