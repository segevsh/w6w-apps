import { assert, assertEquals } from "@std/assert";
import { generateTestKeyPair, mockCtx } from "../_helpers.ts";
import auth from "../../auth/key-pair.ts";

Deno.test("key-pair: declares expected shape and required fields", () => {
  assertEquals(auth.key, "key-pair");
  assertEquals(auth.type, "custom");
  const fieldKeys = (auth.fields ?? []).map((f) => f.key);
  assertEquals(fieldKeys, ["account", "username", "privateKey"]);
  for (const f of auth.fields ?? []) assertEquals(f.required, true);
  assertEquals(auth.fields?.find((f) => f.key === "privateKey")?.type, "secret");
});

Deno.test("key-pair: sign mints a Bearer JWT and stamps the token-type header", async () => {
  const { privateKeyPem } = await generateTestKeyPair();
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.snowflakecomputing.com/api/v2/statements",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { account: "acme", username: "u", privateKey: privateKeyPem } },
    ctx,
  );
  assert(out.headers["authorization"]?.startsWith("Bearer "));
  assertEquals(out.headers["authorization"].split(" ")[1].split(".").length, 3);
  assertEquals(out.headers["x-snowflake-authorization-token-type"], "KEYPAIR_JWT");
});

Deno.test("key-pair: test reports missing fields without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { account: "acme" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("key-pair: test passes on a 401/403-free response (JWT accepted, statement processed)", async () => {
  const { privateKeyPem } = await generateTestKeyPair();
  // 422 = "SELECT 1" reached the SQL layer but hit e.g. "no active warehouse" —
  // still proves the JWT itself was accepted.
  const { ctx, calls } = mockCtx([{
    status: 422,
    body: { code: "390201", message: "no warehouse" },
  }]);
  const result = await auth.test(
    { credential: { account: "acme", username: "u", privateKey: privateKeyPem } },
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/statements");
  assert(calls[0].headers["authorization"]?.startsWith("Bearer "));
});

Deno.test("key-pair: test fails on 401 — the JWT itself was rejected", async () => {
  const { privateKeyPem } = await generateTestKeyPair();
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "390144", message: "JWT token is invalid" },
  }]);
  const result = await auth.test(
    { credential: { account: "acme", username: "u", privateKey: privateKeyPem } },
    ctx,
  );
  assertEquals(result.ok, false);
});

Deno.test("key-pair: afterConnect records account and username on the connection display", () => {
  const out = auth.afterConnect!(
    { credential: { account: " acme ", username: " svc_user " } },
    mockCtx().ctx,
  ) as { account: string; username: string };
  assertEquals(out.account, "acme");
  assertEquals(out.username, "svc_user");
});
