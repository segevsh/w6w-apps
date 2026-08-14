import { assert, assertEquals } from "@std/assert";
import accessToken, { authHeaders, PROBE_PATH } from "../../auth/access-token.ts";
import { LEGACY_BASE_URL } from "../../lib/client.ts";
import { BASE, errorBody, mockCtx, TOKEN } from "../_helpers.ts";

interface SignableRequest {
  url: string;
  headers: Record<string, string>;
}

/** `sign` is network-less, so the ctx it is handed makes no requests. */
function signWith(request: SignableRequest, credential: Record<string, unknown>) {
  return accessToken.sign!({ request, credential } as never, mockCtx([]).ctx) as SignableRequest;
}

const PROBE_URL = `${BASE}${PROBE_PATH}?pageSize=1`;

Deno.test("auth: one secret field, declared as a bearer credential", () => {
  assertEquals(accessToken.key, "access-token");
  assertEquals(accessToken.type, "bearer");
  const fields = accessToken.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["accessToken"]);
  assertEquals(fields[0].type, "secret");
  assertEquals(fields[0].required, true);
});

/**
 * The two generations' credentials are not interchangeable, and the failure when
 * they are mixed up is a bare 401. The hint says which one this field wants
 * before the user finds out the hard way.
 */
Deno.test("auth: the field hint names the V2025 generation", () => {
  const hint = (accessToken.fields ?? [])[0].hint ?? "";
  assert(hint.includes("V2025"), hint);
  assert(hint.includes("/api/v2"), hint);
});

Deno.test("authHeaders: sends the token as a Bearer", () => {
  assertEquals(authHeaders({ accessToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("sign: stamps the bearer and leaves the URL alone", () => {
  const url = `${BASE}/forms`;
  const signed = signWith({ url, headers: {} }, { accessToken: TOKEN });
  assertEquals(signed.headers["authorization"], `Bearer ${TOKEN}`);
  assertEquals(signed.url, url);
});

/**
 * The probe is `/forms` with a single-row page: it is the cheapest endpoint that
 * proves the token works, and — unlike a `/me`-shaped endpoint — its body cannot
 * echo the credential back.
 */
Deno.test("test: probes /forms with a one-row page", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], total: 0 } }]);
  const result = await accessToken.test!({ credential: { accessToken: TOKEN } } as never, ctx);

  assertEquals(result, { ok: true });
  assertEquals(PROBE_PATH, "/forms");
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["authorization"], `Bearer ${TOKEN}`);
});

Deno.test("test: reports a missing token without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await accessToken.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("missing accessToken"), result.message);
  assertEquals(calls.length, 0);
});

/**
 * The likeliest real-world failure is a credential from the older generation, so
 * the rejection names that possibility instead of only saying "rejected".
 */
Deno.test("test: a 401 or 403 points at the wrong-generation credential", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{ status, body: errorBody("Unauthorized") }]);
    const result = await accessToken.test!({ credential: { accessToken: TOKEN } } as never, ctx);
    assertEquals(result.ok, false);
    assert(result.message!.includes(`(${status})`), result.message);
    assert(result.message!.includes("V2025"), result.message);
    assert(result.message!.includes(LEGACY_BASE_URL), result.message);
  }
});

/**
 * A daily quota that has run out is not a bad credential, and must not read as
 * one — the connection is fine, it just cannot be proven right now.
 */
Deno.test("test: a 429 reports an exhausted daily quota, not a bad token", async () => {
  const { ctx } = mockCtx([{ status: 429, body: errorBody("Rate limit exceeded") }]);
  const result = await accessToken.test!({ credential: { accessToken: TOKEN } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("daily API quota"), result.message);
  assert(!result.message!.includes("rejected"), result.message);
});

Deno.test("test: any other non-2xx reports the status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await accessToken.test!({ credential: { accessToken: TOKEN } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("500"), result.message);
});

/** A 200 from something that is not Formstack is not a working connection. */
Deno.test("test: a 200 that is not a Formstack response is rejected", async () => {
  const { ctx } = mockCtx([{ body: "hello", headers: { "content-type": "text/plain" } }]);
  const result = await accessToken.test!({ credential: { accessToken: TOKEN } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("V2025"), result.message);
});

/** The form count is what the connection label renders, so it has to be published. */
Deno.test("afterConnect: records the account's form count", async () => {
  const { ctx } = mockCtx([{ body: { total: 12, data: [{ id: "1" }] } }]);
  const display = await accessToken.afterConnect!(
    { credential: { accessToken: TOKEN } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.account, { forms: 12 });
  assertEquals(accessToken.connectionLabel, "Formstack ({{account.forms}} form(s))");
});

/** The count has appeared under three names across the API's revisions. */
Deno.test("afterConnect: accepts total, totalRecords, or the row count", async () => {
  for (
    const [body, forms] of [
      [{ totalRecords: 4 }, 4],
      [{ data: [{ id: "1" }, { id: "2" }] }, 2],
    ] as const
  ) {
    const { ctx } = mockCtx([{ body }]);
    const display = await accessToken.afterConnect!(
      { credential: { accessToken: TOKEN } } as never,
      ctx,
    ) as Record<string, unknown>;
    assertEquals(display.account, { forms });
  }
});

Deno.test("afterConnect: never republishes the token", async () => {
  const { ctx } = mockCtx([{ body: { total: 1 } }]);
  const display = await accessToken.afterConnect!(
    { credential: { accessToken: TOKEN } } as never,
    ctx,
  );
  assert(!JSON.stringify(display).includes(TOKEN));
});

/** A failed lookup must not block the connection — it just publishes nothing. */
Deno.test("afterConnect: a failure or an unreadable body yields empty metadata", async () => {
  for (const response of [{ status: 500, body: "" }, { body: { nothing: true } }]) {
    const { ctx } = mockCtx([response]);
    assertEquals(
      await accessToken.afterConnect!({ credential: { accessToken: TOKEN } } as never, ctx),
      {},
    );
  }
});

Deno.test("afterConnect: a missing token makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await accessToken.afterConnect!({ credential: {} } as never, ctx), {});
  assertEquals(calls.length, 0);
});
