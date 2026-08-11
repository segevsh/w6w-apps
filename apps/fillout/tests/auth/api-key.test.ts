import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiKeyAuth, { authHeaders, normalizeRegion, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, EU_ROOT, mockCtx, US_ROOT } from "../_helpers.ts";

const KEY = "flt_live_notarealkey";

function runTest(responses: Parameters<typeof mockCtx>[0], credential: unknown) {
  const mock = mockCtx(responses);
  return {
    ...mock,
    result: apiKeyAuth.test({ credential }, mock.ctx),
  };
}

Deno.test("api-key: sign stamps the bearer header and nothing else", async () => {
  const request = { method: "GET", url: "/forms", headers: {} as Record<string, string> };
  const signed = await apiKeyAuth.sign!(
    { request, credential: { apiKey: KEY } },
    {} as HookContext,
  );
  assertEquals(signed.headers, { authorization: `Bearer ${KEY}` });
});

Deno.test("api-key: the header builder is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: `Bearer ${KEY}` });
});

Deno.test("api-key: test probes GET /forms on the connection's region", async () => {
  const us = runTest([{ body: [] }], { apiKey: KEY, region: "us" });
  assertEquals(await us.result, { ok: true });
  assertEquals(us.calls[0].url, `${US_ROOT}${PROBE_PATH}`);
  assertEquals(us.calls[0].headers.authorization, `Bearer ${KEY}`);

  const eu = runTest([{ body: [] }], { apiKey: KEY, region: "eu" });
  assertEquals(await eu.result, { ok: true });
  assertEquals(eu.calls[0].url, `${EU_ROOT}${PROBE_PATH}`);
});

Deno.test("api-key: an absent credential fails without a request", async () => {
  const mock = mockCtx([]);
  assertEquals(await apiKeyAuth.test({ credential: {} }, mock.ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(mock.calls.length, 0);
});

/**
 * **The measured taxonomy.** Every row below is a real response body recorded
 * from `GET https://api.fillout.com/v1/api/forms` on 2026-08-11, and every one
 * of them is an HTTP **400**. A `test` hook that judged by status would return
 * one undifferentiated verdict for all four — including for the case where the
 * key is perfectly good and simply never reached the request.
 *
 * Rows one and two differ by a single capital letter and nothing else, which is
 * exactly why the classifier lowercases and folds them together instead of
 * pretending the casing is a contract.
 */
const MEASURED_400s: Array<{ sent: string; message: string; expect: RegExp }> = [
  {
    sent: "no Authorization header",
    message: "API authorization header missing",
    expect: /no usable Bearer credential/i,
  },
  {
    sent: "Authorization: Bearer  (empty)",
    message: "API Authorization header missing",
    expect: /no usable Bearer credential/i,
  },
  {
    sent: "Authorization: Bearer notreal",
    message: "API key missing underscore",
    expect: /underscore/i,
  },
  {
    sent: "Authorization: Bearer sk_x_yyy",
    message: "API Key invalid",
    expect: /regenerated or revoked/i,
  },
];

for (const row of MEASURED_400s) {
  Deno.test(`api-key: test classifies "${row.message}" from the body, not the 400`, async () => {
    const { result } = runTest(
      [{ status: 400, body: errorBody(400, "Bad Request", row.message) }],
      { apiKey: KEY },
    );
    const verdict = await result;
    assertEquals(verdict.ok, false);
    assert(row.expect.test(verdict.message ?? ""), `${row.message} -> ${verdict.message}`);
  });
}

/**
 * The four verdicts must be four *different* sentences. If they collapsed into
 * one, the classifier would be decoration and the test above would still pass.
 */
Deno.test("api-key: the four measured 400s produce four distinct explanations", async () => {
  const messages = new Set<string>();
  for (const row of MEASURED_400s) {
    const { result } = runTest(
      [{ status: 400, body: errorBody(400, "Bad Request", row.message) }],
      { apiKey: KEY },
    );
    messages.add((await result).message ?? "");
  }
  // Three, not four: rows one and two are deliberately one class — the only
  // difference between them is the capitalisation of "Authorization".
  assertEquals(messages.size, 3, [...messages].join(" | "));
});

Deno.test("api-key: a 429 is a failure that names the rate limit, not a bad key", async () => {
  const { result } = runTest(
    [{
      status: 429,
      body: errorBody(429, "Too Many Requests", "Too many requests. Try again soon."),
    }],
    { apiKey: KEY },
  );
  const verdict = await result;
  assertEquals(verdict.ok, false);
  assert(/5 requests\/second/.test(verdict.message ?? ""), verdict.message);
  assert(!/revoked|underscore/i.test(verdict.message ?? ""), verdict.message);
});

Deno.test("api-key: an unrecognised failure keeps the vendor's own words", async () => {
  const { result } = runTest(
    [{ status: 503, body: errorBody(503, "Service Unavailable", "upstream unavailable") }],
    { apiKey: KEY },
  );
  const verdict = await result;
  assertEquals(verdict.ok, false);
  assert(/503/.test(verdict.message ?? ""), verdict.message);
  assert(/upstream unavailable/.test(verdict.message ?? ""), verdict.message);
});

/** No probe may ever echo the key back to the caller. */
Deno.test("api-key: no verdict message contains the credential", async () => {
  for (const row of [...MEASURED_400s.map((r) => r.message), "anything else"]) {
    const { result } = runTest(
      [{ status: 400, body: errorBody(400, "Bad Request", row) }],
      { apiKey: KEY },
    );
    assert(!((await result).message ?? "").includes(KEY), `leaked the key for "${row}"`);
  }
});

Deno.test("api-key: afterConnect publishes only the region", async () => {
  assertEquals(
    await apiKeyAuth.afterConnect!(
      { credential: { apiKey: KEY, region: "eu" } },
      {} as HookContext,
    ),
    { region: "eu" },
  );
  assertEquals(
    await apiKeyAuth.afterConnect!({ credential: { apiKey: KEY } }, {} as HookContext),
    { region: "us" },
  );
});

Deno.test("api-key: an unknown region falls back to US rather than building a bad host", () => {
  assertEquals(normalizeRegion("apac"), "us");
  assertEquals(normalizeRegion(undefined), "us");
  assertEquals(normalizeRegion("eu"), "eu");
});
