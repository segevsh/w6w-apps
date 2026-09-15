import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY = "md_unitTestFixtureNotARealKey00000000000000";

Deno.test("api-key: sign stamps the raw key with NO Bearer prefix", () => {
  const request = {
    method: "GET",
    url: "https://api-v2.mindee.net/v2/search/models",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, KEY);
  assert(!signed.headers.authorization.startsWith("Bearer "));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: KEY });
});

/**
 * Pinned here as well as in `lib/client.test.ts` — this is the file someone
 * edits when "fixing" the header to add `Bearer `, which Mindee's own docs
 * say explicitly not to do.
 */
Deno.test("api-key: the probe is search/models, not a whoami", () => {
  assertEquals(PROBE_PATH, "/v2/search/models");
});

Deno.test("api-key: test passes when the models search answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { models: [], pagination: {} } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v2/search/models");
  assertEquals(queryOf(calls[0].url), { per_page: "1" });
  assertEquals(calls[0].headers.authorization, KEY);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: an invalid key (401-001) is reported as a rejected key", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody(401, "401-001", "Invalid API key", "The provided API key is invalid."),
    },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the API key/i.test(result.message ?? ""), result.message);
  assert(/401-001/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a missing credential (401-008) is reported distinctly", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody(401, "401-008", "Missing credentials", "Credentials are required."),
    },
  ]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/received no credential/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a Bearer-prefixed misuse (401-009) is reported distinctly", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody(
        401,
        "401-009",
        "Organization ID missing for platform authentication",
        "Organization ID is required for JWT authentication. Do not include `Bearer ` if using an API key.",
      ),
    },
  ]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/Bearer-prefixed/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/Mindee 500/.test(result.message ?? ""), result.message);
});
