import { assert, assertEquals } from "@std/assert";
import apiToken, {
  authHeaders,
  fetchProbe,
  PROBE_PATH,
  PROBE_URL,
  readProbe,
} from "../../auth/api-token.ts";
import { mockCtx, pathOf, unauthorisedResponse } from "../_helpers.ts";

const TOKEN = "unit-test-fixture-not-a-real-streamtime-token";

const ORGANISATION = {
  name: "Acme Ltd",
  domain: "acme",
  currency: { id: "NZD", name: "New Zealand Dollar", symbol: "$" },
  address: "123 High St, Cityville",
  country: { id: "NZ", name: "New Zealand" },
};

Deno.test("api-token: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://api.streamtime.net/v2/jobs",
    headers: {} as Record<string, string>,
  };
  const signed = apiToken.sign!({ request, credential: { apiToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://api.streamtime.net/v2/jobs");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("api-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiToken: ` ${TOKEN} ` }), { authorization: `Bearer ${TOKEN}` });
  // A credential that never arrived still produces a well-formed header — the
  // probe, not this function, is what decides that it is empty.
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

/**
 * The probe is pinned here as well as in the entry-module test, because this is
 * the file somebody edits when a shorter endpoint looks tempting. `/organisation`
 * is the authenticated read whose response carries no credential material.
 */
Deno.test("api-token: the probe is GET /organisation", () => {
  assertEquals(PROBE_PATH, "/organisation");
  assertEquals(PROBE_URL, "https://api.streamtime.net/v2/organisation");
});

Deno.test("api-token: test passes on 200 with an Organisation body", async () => {
  const { ctx, calls } = mockCtx([{ body: ORGANISATION }]);
  const result = await apiToken.test!({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v2/organisation");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("api-token: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test!({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assert(/missing `apiToken`/.test(result.message ?? ""), result.message);
  assertEquals(calls.length, 0);
});

/**
 * The vendor's rejection sentence is quoted into the message — that is the only
 * evidence Streamtime gives, and it makes the "missing token, revoked token and
 * unknown path are the same answer" caveat visible where it is needed.
 */
Deno.test("api-token: test reports a rejected token from the vendor's own words", async () => {
  const { ctx } = mockCtx([unauthorisedResponse()]);
  const result = await apiToken.test!({ credential: { apiToken: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(
    result.message?.includes("You are not authorised to make this request"),
    result.message,
  );
  assert(/Company Settings/.test(result.message ?? ""), result.message);
  assert(!result.message?.includes("garbage"), "the credential was echoed back");
});

/**
 * A 200 that is not an Organisation is not evidence of a live credential — a
 * captive portal or a proxy answering 200 would otherwise pass the probe.
 */
Deno.test("api-token: a 200 without an Organisation body is not accepted", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const result = await apiToken.test!({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/did not accept the token/.test(result.message ?? ""), result.message);
});

Deno.test("readProbe: four outcomes, none of them decided by the status code", async () => {
  const accepted = await readProbe(
    new Response(JSON.stringify(ORGANISATION), { status: 200 }),
  );
  assertEquals(accepted.reason, "accepted");
  assertEquals(accepted.organisation?.name, "Acme Ltd");

  const rejected = await readProbe(
    new Response("You are not authorised to make this request", { status: 401 }),
  );
  assertEquals(rejected.reason, "rejected");

  // The same status code, a body this app does not recognise: reported as
  // unknown rather than as a dead credential.
  const unknown = await readProbe(new Response("<html>proxy</html>", { status: 401 }));
  assertEquals(unknown.reason, "unexpected");
  assertEquals(unknown.status, 401);

  const serverError = await readProbe(new Response("boom", { status: 503 }));
  assertEquals(serverError.reason, "unexpected");
  assertEquals(serverError.status, 503);
});

Deno.test("fetchProbe: a transport failure is unknown, not a rejection", async () => {
  const { ctx } = mockCtx([]);
  const reading = await fetchProbe(ctx);
  assertEquals(reading.reason, "unexpected");
  assertEquals(reading.status, 0);
  assert(/could not reach/.test(reading.detail), reading.detail);
});

Deno.test("afterConnect: publishes the organisation name and domain, and nothing else", async () => {
  const { ctx } = mockCtx([{ body: ORGANISATION }]);
  const label = await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(label, { organisation: "Acme Ltd", domain: "acme" });
  assert(!JSON.stringify(label).includes("Dollar"), "the object was published whole");
  assert(!JSON.stringify(label).includes("High St"), "the object was published whole");
});

Deno.test("afterConnect: a failure returns nothing rather than failing the connection", async () => {
  const { ctx } = mockCtx([unauthorisedResponse()]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx), {});
});
