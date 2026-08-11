import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { PUBLIC_ENDPOINTS } from "../../lib/client.ts";
import { API_ROOT, mockCtx, pathOf, UNAUTHORIZED_BODY } from "../_helpers.ts";

const CURRENT_USER = {
  user: {
    id: 491923,
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    default_currency: "USD",
    locale: "en",
  },
};

Deno.test("api-key: declares a bearer method with a secret field", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "bearer");
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].key, "apiKey");
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(typeof apiKey.test, "function");
  assertEquals(typeof apiKey.sign, "function");
});

Deno.test("api-key: sign stamps the bearer header and returns the request", () => {
  const request = {
    url: `${API_ROOT}/get_groups`,
    method: "GET",
    headers: {} as Record<
      string,
      string
    >,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: "sw-secret" } }, mockCtx().ctx);
  assertEquals((signed as typeof request).headers["authorization"], "Bearer sw-secret");
});

/** The one place the wire format is built, so `test` cannot drift from `sign`. */
Deno.test("api-key: authHeaders is the single source of the header shape", () => {
  assertEquals(authHeaders({ apiKey: "k" }), { authorization: "Bearer k" });
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

Deno.test("api-key: sign never puts the key in a URL", () => {
  const request = {
    url: `${API_ROOT}/get_groups`,
    method: "GET",
    headers: {} as Record<
      string,
      string
    >,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: "sw-secret" } },
    mockCtx().ctx,
  ) as typeof request;
  assert(!signed.url.includes("sw-secret"), "the credential leaked into the URL");
});

// --- test ------------------------------------------------------------------

Deno.test("api-key: test probes get_current_user with the bearer header", async () => {
  const { ctx, calls } = mockCtx([{ body: CURRENT_USER }]);
  assertEquals(await apiKey.test({ credential: { apiKey: "k" } }, ctx), { ok: true });

  assertEquals(pathOf(calls[0].url), "/api/v3.0/get_current_user");
  assertEquals(calls[0].headers["authorization"], "Bearer k");
});

/**
 * A 200 is necessary but not sufficient in this API: it answers 200 with an
 * `errors` payload on failure, so the whoami must actually carry a user.
 */
Deno.test("api-key: a 200 with no user object is not a pass", async () => {
  const { ctx } = mockCtx([{ body: { errors: { base: ["nope"] } } }]);
  const result = await apiKey.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result.ok, false);
  assert(/carried no user object/.test(result.message ?? ""), result.message);
});

/**
 * Measured 2026-08-11: the byte-identical 54-byte 401 body comes back for a
 * missing header, a fake key, an empty key and a wrong scheme alike. The
 * message must not pretend to know which one happened.
 */
Deno.test("api-key: a 401 says the four causes are indistinguishable", async () => {
  const { ctx } = mockCtx([{ status: 401, body: UNAUTHORIZED_BODY }]);
  const result = await apiKey.test({ credential: { apiKey: "wrong" } }, ctx);

  assertEquals(result.ok, false);
  assert(/wrong, revoked, empty, or never reached/.test(result.message ?? ""), result.message);
  assert(/secure\.splitwise\.com\/apps/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: an absent credential fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await apiKey.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a 429 does not blame the key", async () => {
  const { ctx } = mockCtx([{ status: 429, body: {} }]);
  const result = await apiKey.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result.ok, false);
  assert(/may well be fine/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 403 is reported as accepted-but-refused, not as a bad key", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "forbidden" } }]);
  const result = await apiKey.test({ credential: { apiKey: "k" } }, ctx);
  assert(/accepted the key but refused/.test(result.message ?? ""), result.message);
});

// --- afterConnect ----------------------------------------------------------

/**
 * The label carries a name and an id and NOT the account's email. A connection
 * label is rendered in lists, embedded in run records and copied into logs;
 * putting a personal email there spreads PII for an ergonomic gain a name
 * already delivers.
 */
Deno.test("api-key: afterConnect publishes a name and id, never the email", async () => {
  const { ctx } = mockCtx([{ body: CURRENT_USER }]);
  const label = await apiKey.afterConnect!({ credential: { apiKey: "k" } }, ctx);

  assertEquals(label, { name: "Ada Lovelace", userId: 491923 });
  assert(!JSON.stringify(label).includes("ada@example.com"), "the email leaked into the label");
});

Deno.test("api-key: afterConnect failure is silent — a label must not fail a good key", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: "k" } }, ctx), {});
});

Deno.test("api-key: afterConnect survives a user with no name", async () => {
  const { ctx } = mockCtx([{ body: { user: { id: 7 } } }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: "k" } }, ctx), { userId: 7 });
});

// --- the probe choice, pinned ----------------------------------------------

/**
 * `get_currencies` and `get_categories` answer HTTP 200 with their full payload
 * and NO credential (measured 2026-08-11), so a Connection whose key never got
 * attached would pass a probe against either. Swapping the probe to one of them
 * has to be a deliberate act, not a tidy-up.
 */
Deno.test("api-key: the probe is get_current_user, not one of the two public endpoints", () => {
  assertEquals(PROBE_PATH, "/get_current_user");
  assertEquals([...PUBLIC_ENDPOINTS], ["/get_currencies", "/get_categories"]);
  assert(
    !PUBLIC_ENDPOINTS.includes(PROBE_PATH as typeof PUBLIC_ENDPOINTS[number]),
    "the auth probe was pointed at an endpoint that answers without a credential",
  );
});

/**
 * The source-level version of the same guard, because a future edit could
 * inline a path instead of changing the constant. It covers `health/` too — an
 * unauthenticated reachability probe pointed at a public endpoint would prove
 * even less than one pointed at the whoami.
 *
 * The vacuity guard matters here: with `PUBLIC_ENDPOINTS` empty, or with the
 * comment stripper eating the whole file, this would pass having checked
 * nothing.
 */
Deno.test("api-key: no public endpoint appears in any auth or health module", async () => {
  assertEquals(PUBLIC_ENDPOINTS.length, 2, "the list this scan is built from is empty");

  let scanned = 0;
  for (const dir of ["auth", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = await Deno.readTextFile(
        new URL(`../../${dir}/${entry.name}`, import.meta.url),
      );
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      assert(code.trim().length > 0, `${dir}/${entry.name}: stripped to nothing — scan is blind`);
      scanned++;
      for (const path of PUBLIC_ENDPOINTS) {
        assert(!code.includes(path), `${dir}/${entry.name} references the public endpoint ${path}`);
      }
    }
  }
  assertEquals(scanned, 4, "expected auth/api-key + health/{service,api,quota}");
});

/**
 * No `oauth2` block is declared: Splitwise's documented OAuth 2 token endpoint
 * returns the site's byte-identical 404 under every variant probed on
 * 2026-08-11, so a Connect flow built on it would die at the exchange. The
 * evidence lives in the module doc; this stops the block being added back
 * without revisiting it.
 */
Deno.test("api-key: no oauth2 config is declared while the token endpoint 404s", () => {
  assertEquals(apiKey.oauth2, undefined);
});
