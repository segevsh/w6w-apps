import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

const CRED = { siteUrl: "https://docs.getgrist.com", apiKey: "k-secret" };

Deno.test("api-key: sign stamps a bearer Authorization header", () => {
  const req = { headers: {} as Record<string, string> };
  const out = auth.sign!({ request: req, credential: CRED } as never, {} as never) as typeof req;
  assertEquals(out.headers["authorization"], "Bearer k-secret");
});

Deno.test("api-key: sign is the only place the credential appears", () => {
  const req = { headers: {} as Record<string, string> };
  auth.sign!({ request: req, credential: CRED } as never, {} as never);
  // Exactly one header, and it is the one the vendor documents.
  assertEquals(Object.keys(req.headers), ["authorization"]);
});

Deno.test("api-key: test probes /api/profile/user on the connection's own site", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, email: "a@b.c", anonymous: false } }]);
  const res = await auth.test({ credential: CRED }, ctx);
  assertEquals(res.ok, true);
  assertEquals(calls[0].url, "https://docs.getgrist.com/api/profile/user");
  assertEquals(calls[0].headers["authorization"], "Bearer k-secret");
});

Deno.test("api-key: test follows a self-hosted siteUrl", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, anonymous: false } }]);
  await auth.test({ credential: { ...CRED, siteUrl: "https://grist.internal.example/" } }, ctx);
  assertEquals(calls[0].url, "https://grist.internal.example/api/profile/user");
});

/**
 * The behaviour this whole guard exists for. Verified on docs.getgrist.com on
 * 2026-08-03: with no Authorization header, /api/profile/user answers 200 with
 * `{"anonymous":true}`. A bare `res.ok` test would call that a live credential.
 */
Deno.test("api-key: test REJECTS a 200 that comes back as the anonymous user", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { id: 40, email: "anon@getgrist.com", name: "Anonymous", anonymous: true },
  }]);
  const res = await auth.test({ credential: CRED }, ctx);
  assertEquals(res.ok, false);
  assert(/anonymous/i.test(res.message ?? ""));
});

Deno.test("api-key: test reports a 401 as a failure with its status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Bad request: invalid API key" } }]);
  const res = await auth.test({ credential: CRED }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("401"));
  // The failure message must not echo the key back.
  assert(!res.message!.includes("k-secret"));
});

Deno.test("api-key: test refuses to call anything when a half is missing", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await auth.test({ credential: { apiKey: "k" } }, ctx)).ok, false);
  assertEquals((await auth.test({ credential: { siteUrl: "https://x" } }, ctx)).ok, false);
  assertEquals(calls.length, 0, "a missing field must not produce a network call");
});

Deno.test("api-key: afterConnect republishes the site and user onto display", async () => {
  const { ctx } = mockCtx([{ body: { id: 101, name: "Helga", email: "h@example.com" } }]);
  const display = await auth.afterConnect!({ credential: CRED } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(display.siteUrl, "https://docs.getgrist.com");
  assertEquals((display.site as { host: string }).host, "docs.getgrist.com");
  assertEquals((display.user as { name: string }).name, "Helga");
  // The credential must not survive into display metadata.
  assert(!JSON.stringify(display).includes("k-secret"));
});

Deno.test("api-key: afterConnect survives a profile call that fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "nope" } }]);
  const display = await auth.afterConnect!({ credential: CRED } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(display.siteUrl, "https://docs.getgrist.com");
  assertEquals((display.user as { name?: string }).name, undefined);
});

Deno.test("api-key: the site URL is a plain string field, and the key a secret", () => {
  const fields = auth.fields!;
  assertEquals(fields.map((f) => f.key), ["siteUrl", "apiKey"]);
  assertEquals(fields[0].type, "string");
  assertEquals(fields[0].default, "https://docs.getgrist.com");
  assertEquals(fields[1].type, "secret");
  assert(fields.every((f) => f.required === true));
});
