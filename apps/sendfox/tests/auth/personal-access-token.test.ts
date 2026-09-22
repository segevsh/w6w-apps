import { assert, assertEquals } from "@std/assert";
import personalAccessToken, {
  authHeaders,
  looksLikeUser,
  PROBE_PATH,
  UNAUTHENTICATED_BODY,
} from "../../auth/personal-access-token.ts";
import { accountRestrictedBody, errorBody, mockCtx, pathOf, queryOf, user } from "../_helpers.ts";

const TOKEN = "sendfox_unit_test_fixture_not_a_real_token";

Deno.test("personal-access-token: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.sendfox.com/me",
    headers: {} as Record<string, string>,
  };
  const signed = personalAccessToken.sign!(
    { request, credential: { token: TOKEN } },
    {} as never,
  ) as { url: string; headers: Record<string, string> };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  // SendFox documents no `?token=`, and this app never builds one: a workflow
  // host logs request URLs, not headers.
  assertEquals(signed.url, "https://api.sendfox.com/me");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("personal-access-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ token: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("personal-access-token: the probe is GET /me", () => {
  assertEquals(PROBE_PATH, "/me");
});

Deno.test("personal-access-token: test passes when /me answers a User", async () => {
  const { ctx, calls } = mockCtx([{ body: user() }]);
  const result = await personalAccessToken.test({ credential: { token: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/me");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

/**
 * Success is classified from the BODY, not the status code: a `200` that is not
 * a User is not accepted as proof that this is SendFox's API answering.
 */
Deno.test("personal-access-token: a 200 that is not a User is refused", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const result = await personalAccessToken.test({ credential: { token: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/not a User object/.test(result.message ?? ""), result.message);
});

Deno.test("personal-access-token: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await personalAccessToken.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Live measurement 2026-09-22: a missing header and a fake bearer answer the
 * SAME body, so `test` names both possibilities rather than distinguishing them.
 */
Deno.test("personal-access-token: a 401 mentions both the missing and the bad token", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { message: UNAUTHENTICATED_BODY } },
  ]);
  const result = await personalAccessToken.test({ credential: { token: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/missing and an invalid token/.test(result.message ?? ""), result.message);
  assert(/Lifetime or Empire plan/.test(result.message ?? ""), result.message);
});

Deno.test("personal-access-token: a restricted account reports its status URL", async () => {
  const { ctx } = mockCtx([{ status: 403, body: accountRestrictedBody() }]);
  const result = await personalAccessToken.test({ credential: { token: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/account_restricted/.test(result.message ?? ""), result.message);
  assert(/https:\/\/sendfox.com\/account\/status/.test(result.message ?? ""), result.message);
});

Deno.test("personal-access-token: a plain 403 names the plan requirement", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("Forbidden") }]);
  const result = await personalAccessToken.test({ credential: { token: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/Lifetime or Empire plan/.test(result.message ?? ""), result.message);
});

Deno.test("personal-access-token: a 500 is an HTTP failure, not a bad token", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await personalAccessToken.test({ credential: { token: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("personal-access-token: afterConnect publishes only name and email", async () => {
  const { ctx, calls } = mockCtx([{ body: user() }]);
  const display = await personalAccessToken.afterConnect!({ credential: { token: TOKEN } }, ctx);

  assertEquals(pathOf(calls[0].url), "/me");
  assertEquals(display, { name: "Acme", email: "owner@acme.example" });
  assert(!JSON.stringify(display).includes("contact_limit"));
});

Deno.test("personal-access-token: afterConnect stays silent when /me fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("Forbidden") }]);
  assertEquals(await personalAccessToken.afterConnect!({ credential: { token: TOKEN } }, ctx), {});
});

Deno.test("personal-access-token: afterConnect stays silent with no name", async () => {
  const { ctx } = mockCtx([{ body: { id: 1 } }]);
  assertEquals(await personalAccessToken.afterConnect!({ credential: { token: TOKEN } }, ctx), {});
});

Deno.test("personal-access-token: looksLikeUser requires a non-empty email", () => {
  assertEquals(looksLikeUser({ email: "a@b.c" }), true);
  assertEquals(looksLikeUser({ email: "" }), false);
  assertEquals(looksLikeUser({ id: 1 }), false);
  assertEquals(looksLikeUser(null), false);
  assertEquals(looksLikeUser("Unauthenticated."), false);
});
