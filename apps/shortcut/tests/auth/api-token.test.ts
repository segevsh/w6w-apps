import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, PROBE_PATH } from "../../auth/api-token.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const TOKEN = "shortcut-unit-test-fixture-not-a-real-token";

Deno.test("api-token: sign stamps the Shortcut-Token header verbatim, no prefix", () => {
  const request = {
    method: "GET",
    url: "https://api.app.shortcut.com/api/v3/member",
    headers: {} as Record<string, string>,
  };
  const signed = apiToken.sign!({ request, credential: { apiToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers["shortcut-token"], TOKEN);
  assert(!("authorization" in signed.headers), "must not also set a Bearer/Authorization header");
  assertEquals(signed.url, "https://api.app.shortcut.com/api/v3/member");
});

Deno.test("api-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiToken: TOKEN }), { "shortcut-token": TOKEN });
});

Deno.test("api-token: the probe is /member", () => {
  assertEquals(PROBE_PATH, "/member");
});

Deno.test("api-token: test passes when /member answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", name: "Ada" } }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v3/member");
  assertEquals(calls[0].headers["shortcut-token"], TOKEN);
});

Deno.test("api-token: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The two 401 shapes Shortcut distinguishes were both observed live on
 * 2026-09-15 and are two different problems: one says the credential never
 * reached the request, the other says the token itself is wrong.
 */
Deno.test("api-token: a missing-token 401 is reported as never having arrived", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody(
        "organization2_missing",
        "Sorry, the organization context for this request is missing.",
      ),
    },
  ]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/received no token/i.test(result.message ?? ""), result.message);
});

Deno.test("api-token: an unauthorized 401 is reported as a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("unauthorized", "Unauthorized") }]);
  const result = await apiToken.test({ credential: { apiToken: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the token/i.test(result.message ?? ""), result.message);
});

Deno.test("api-token: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-token: afterConnect publishes only the display name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", name: "Ada Lovelace", role: "admin" } }]);
  const display = await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/member");
  assertEquals(display, { name: "Ada Lovelace" });
});

Deno.test("api-token: afterConnect falls back to mention_name when name is absent", async () => {
  const { ctx } = mockCtx([{ body: { id: "u1", mention_name: "ada" } }]);
  const display = await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx);
  assertEquals(display, { name: "ada" });
});

Deno.test("api-token: afterConnect stays silent when the read fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("unauthorized", "no") }]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx), {});
});
