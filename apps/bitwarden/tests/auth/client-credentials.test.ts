import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/client-credentials.ts";

const TOKEN = { access_token: "tok-1", expires_in: 3600, token_type: "Bearer" };
const fields = { region: "us", clientId: "organization.abc", clientSecret: "s3cret" };

Deno.test("exchange: posts a FORM body to the region's identity host", async () => {
  const { ctx, calls } = mockCtx([{ body: TOKEN }]);
  const cred = await auth.exchange!({ fields } as never, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://identity.bitwarden.com/connect/token");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("grant_type"), "client_credentials");
  assertEquals(form.get("scope"), "api.organization");
  assertEquals(form.get("client_id"), "organization.abc");
  assertEquals(cred.accessToken, "tok-1");
  assertEquals(cred.region, "us");
  // expires ~58 minutes out: early, but not immediately
  const ms = Date.parse(String(cred.expiresAt)) - Date.now();
  assert(ms > 55 * 60_000 && ms < 60 * 60_000, String(ms));
});

Deno.test("exchange: the EU region uses identity.bitwarden.eu", async () => {
  const { ctx, calls } = mockCtx([{ body: TOKEN }]);
  await auth.exchange!({ fields: { ...fields, region: "eu" } } as never, ctx);
  assertEquals(calls[0].url, "https://identity.bitwarden.eu/connect/token");
});

Deno.test("exchange: an unknown region is refused, never turned into a host", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await auth.exchange!({ fields: { ...fields, region: "evil.example.com" } } as never, ctx),
    Error,
    "must be",
  );
  assertEquals(calls.length, 0);
});

Deno.test("exchange: a personal API key is refused with an explanation", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await auth.exchange!({ fields: { ...fields, clientId: "user.abc" } } as never, ctx),
    Error,
    "personal API key",
  );
  assertEquals(calls.length, 0);
});

/** Measured live: the token endpoint answers 400, not 401, for a rejected key. */
Deno.test("exchange: classifies a rejected key from the body's error code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "invalid_client" } }]);
  const err = await assertRejects(async () => await auth.exchange!({ fields } as never, ctx));
  assert(/invalid_client/.test((err as Error).message));
  assert(/wrong region/.test((err as Error).message));
});

Deno.test("refresh: mints again from the stored key and keeps the rest", async () => {
  const { ctx, calls } = mockCtx([{ body: { ...TOKEN, access_token: "tok-2" } }]);
  const cred = await auth.refresh!(
    { credential: { ...fields, accessToken: "old" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(cred.accessToken, "tok-2");
  assertEquals(cred.clientSecret, "s3cret");
  assertEquals(calls.length, 1);
});

Deno.test("sign: stamps a bearer header and keeps the others", async () => {
  const out = await auth.sign!({
    request: {
      url: "https://api.bitwarden.com/public/members",
      method: "GET",
      headers: { a: "b" },
    },
    credential: { accessToken: "tok-1" },
  } as never, mockCtx().ctx);
  assertEquals((out as { headers: Record<string, string> }).headers, {
    a: "b",
    authorization: "Bearer tok-1",
  });
});

Deno.test("test: ok on a 200 from /public/policies, and the message echoes no secret", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [] } }]);
  const res = await auth.test!({ credential: { ...fields, region: "eu" } } as never, ctx);
  assertEquals(calls[0].url, "https://api.bitwarden.eu/public/policies");
  assertEquals(res.ok, true);
  assert(!/s3cret|tok-1/.test(res.message ?? ""));
});

Deno.test("test: a 401 is a failure explained as an expired or mismatched key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const res = await auth.test!({ credential: fields } as never, ctx);
  assertEquals(res.ok, false);
  assert(/rotated|region/.test(res.message ?? ""), res.message);
});

Deno.test("afterConnect: exposes region and label for the client and the connection name", async () => {
  const d = await auth.afterConnect!(
    { credential: { ...fields, region: "eu" } } as never,
    {} as never,
  );
  assertEquals(d, { region: "eu", regionLabel: "EU cloud", clientId: "organization.abc" });
});
