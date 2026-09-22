import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";

const cred = { apiKey: "LOFTY-KEY-123" };

const sign = (url: string, headers: Record<string, string> = {}) =>
  auth.sign!({
    request: { url, method: "GET", headers },
    credential: cred,
  } as never, mockCtx([]).ctx) as { url: string; headers: Record<string, string> };

const profile = {
  id: 11,
  teamId: 12345,
  memberUserId: 100234,
  roleName: "Agent",
  email: "alice@example.com",
  firstName: "Alice",
  lastName: "Johnson",
  assignedLeadCount: 42,
};

/** The literal lowercase `token ` prefix, which is the whole point. */
Deno.test("api-key: signs with the literal `token ` prefix, not Bearer", () => {
  const signed = sign("https://api.lofty.com/v1.0/me");
  assertEquals(signed.headers["authorization"], "token LOFTY-KEY-123");
  assertEquals(authHeaders(cred), { authorization: "token LOFTY-KEY-123" });
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "authorization");
});

Deno.test("api-key: the probe is the whoami, signed the same way", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: profile }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, "https://api.lofty.com/v1.0/me");
  assertEquals(calls[0].headers["authorization"], "token LOFTY-KEY-123");
  assertEquals(result.ok, true);
  assert(/Alice Johnson/.test(result.message!), result.message);
  assert(/team 12345/.test(result.message!), result.message);
});

/** A `200` that is not a profile is not a live credential. */
Deno.test("api-key: a 200 whose body is a JSON string is a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: '"something went wrong"' }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/did not return a user profile/.test(result.message!), result.message);
});

Deno.test("api-key: an object body without an id is not a profile", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { ok: true } }]);
  assertEquals((await auth.test!({ credential: cred } as never, ctx)).ok, false);
});

/** Lofty's documented 401 body is a plain JSON string. */
Deno.test("api-key: a 401 reports Lofty's own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: '"invalid api token"' }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 401/.test(result.message!), result.message);
  assert(/invalid api token/.test(result.message!), result.message);
});

Deno.test("api-key: a missing key is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assert(/missing apiKey/.test(result.message!), result.message);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: an unreachable host fails cleanly", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/could not reach/.test(result.message!), result.message);
});

/** A probe's result is stored and displayed; it must not carry the key back. */
Deno.test("api-key: the probe never echoes the credential", async () => {
  const { ctx } = mockCtx([{ status: 200, body: profile }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assert(!JSON.stringify(result).includes("LOFTY-KEY-123"), JSON.stringify(result));
  // The whoami's documented shape has no key/token field at all.
  assertEquals(Object.keys(profile).some((k) => /key|token|secret/i.test(k)), false);
});

Deno.test("api-key: afterConnect publishes a display name and nothing else", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: profile }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx);
  assertEquals(calls[0].url, `https://api.lofty.com/v1.0${PROBE_PATH}`);
  assertEquals(display, { firstName: "Alice", lastName: "Johnson" });
});

Deno.test("api-key: a failed afterConnect is silent, not fatal", async () => {
  const { ctx } = mockCtx([{ status: 500, body: '"boom"' }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, ctx), {});
});

Deno.test("api-key: the field is a secret", () => {
  const field = auth.fields!.find((f) => f.key === "apiKey")!;
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
  assert(/Settings > Integrations > API/.test(field.hint!), field.hint);
});
