import { assert, assertEquals } from "@std/assert";
import apiKey, { AUTH_SCHEME, authHeaders, balanceUrl } from "../../auth/api-key.ts";
import { hostOf, mockCtx, queryOf } from "../_helpers.ts";

const SECRET = "sk-live-0000-1111-2222-3333";
const { ctx: hookCtx } = mockCtx();

Deno.test("api-key: sign stamps `Authorization: Apikey <key>` for the Standard API", async () => {
  const request = {
    url: "https://api.semrush.com/apis/v4/backlinks/v1/overview?url=example.com",
    method: "GET",
    headers: {} as Record<string, string>,
  };

  const signed = await apiKey.sign!({ request, credential: { apiKey: SECRET } }, hookCtx);

  assertEquals(signed.headers["authorization"], `${AUTH_SCHEME} ${SECRET}`);
  assertEquals(AUTH_SCHEME, "Apikey");
  // The key never reaches a Standard-API URL.
  assertEquals(queryOf(signed.url).key, undefined);
});

Deno.test("api-key: sign appends `?key=` for the legacy balance host only", async () => {
  const request = {
    url: "https://www.semrush.com/users/countapiunits.html",
    method: "GET",
    headers: {} as Record<string, string>,
  };

  const signed = await apiKey.sign!({ request, credential: { apiKey: SECRET } }, hookCtx);

  assertEquals(hostOf(signed.url), "www.semrush.com");
  assertEquals(queryOf(signed.url), { key: SECRET });
  // No header form for that endpoint — nothing to send.
  assertEquals(signed.headers["authorization"], undefined);
});

Deno.test("api-key: authHeaders is the single source of the header format", () => {
  assertEquals(authHeaders({ apiKey: "abc" }), { authorization: "Apikey abc" });
  assertEquals(balanceUrl("abc"), "https://www.semrush.com/users/countapiunits.html?key=abc");
});

Deno.test("api-key: test classifies a 200 body as a live key, from the body not the status", async () => {
  const { ctx, calls } = mockCtx([{ body: "1,000" }]);

  const result = await apiKey.test({ credential: { apiKey: SECRET } }, ctx);

  assertEquals(result.ok, true);
  assertEquals(result.message, "1000 API units remaining");
  assertEquals(hostOf(calls[0].url), "www.semrush.com");
  assertEquals(queryOf(calls[0].url), { key: SECRET });
  // Nothing was sent as an Authorization header on this host.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api-key: a missing key short-circuits before any request", async () => {
  const { ctx, calls } = mockCtx([]);

  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(result.message, "credential missing apiKey");
  assertEquals(calls.length, 0);
});

/**
 * The credential-echo trap. The vendor's body here is
 * `{"errors":[{"field":"key","message":"invalid api key: <the key sent>"}]}` —
 * so the classification may read `field`, and must never surface `message`.
 */
Deno.test("api-key: test does NOT echo the vendor's raw error text on a rejected key", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: JSON.stringify({
        errors: [{ field: "key", message: `invalid api key: ${SECRET}` }],
      }),
    },
  ]);

  const result = await apiKey.test({ credential: { apiKey: SECRET } }, ctx);

  assertEquals(result.ok, false);
  assert(!result.message!.includes(SECRET), "the API key leaked into the test message");
  assert(
    !result.message!.includes("invalid api key"),
    "the vendor's raw message was passed through",
  );
  assertEquals(
    result.message,
    "SEMrush rejected the API key. Check it was copied exactly and still has units bought " +
      "against it (Subscription info > API Units).",
  );
});

Deno.test("api-key: a 200 that is not a unit count is not a valid key", async () => {
  const { ctx } = mockCtx([{ body: "<html>maintenance</html>" }]);

  const result = await apiKey.test({ credential: { apiKey: SECRET } }, ctx);

  assertEquals(result.ok, false);
  assert(!result.message!.includes("maintenance"));
  assertEquals(
    result.message,
    "SEMrush returned HTTP 200 from the API-units endpoint but the body was not a unit count",
  );
});

Deno.test("api-key: an unexpected status names only the status, never the body", async () => {
  const { ctx } = mockCtx([{ status: 500, body: `upstream said no for ${SECRET}` }]);

  const result = await apiKey.test({ credential: { apiKey: SECRET } }, ctx);

  assertEquals(result.ok, false);
  assert(!result.message!.includes(SECRET));
  assert(!result.message!.includes("upstream said no"));
  assertEquals(result.message, "SEMrush returned HTTP 500 from the API-units endpoint");
});

Deno.test("api-key: the credential field is a secret", () => {
  const field = apiKey.fields?.find((f) => f.key === "apiKey");
  assertEquals(field?.type, "secret");
  assertEquals(field?.required, true);
});
