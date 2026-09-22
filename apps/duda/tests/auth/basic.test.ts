import { assert, assertEquals } from "@std/assert";
import { EU, mockCtx, US } from "../_helpers.ts";
import auth from "../../auth/basic.ts";

const CRED = { apiUser: "api-user", apiPassword: "api-pass" };

Deno.test("basic: is the documented method with region, user and password fields", () => {
  assertEquals(auth.key, "basic");
  assertEquals(auth.type, "basic");

  const region = auth.fields!.find((f) => f.key === "region");
  const user = auth.fields!.find((f) => f.key === "apiUser");
  const password = auth.fields!.find((f) => f.key === "apiPassword");

  assertEquals(region?.type, "select");
  assertEquals(region?.default, "US");
  assertEquals(
    (region?.options as Array<{ value: string }>).map((o) => o.value),
    ["US", "EU"],
  );
  assertEquals(user?.required, true);
  assertEquals(password?.type, "secret");
  assertEquals(password?.required, true);
  // The pair is laid out on one row, the way zendesk's email + token is.
  assertEquals(user?.row, "creds");
  assertEquals(password?.row, "creds");
});

Deno.test("basic: sign sets only the authorization header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: `${US}/api/sites/multiscreen`,
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: CRED }, ctx);

  assertEquals(out.headers["authorization"], `Basic ${btoa("api-user:api-pass")}`);
  assertEquals(Object.keys(out.headers), ["authorization"]);
  // The region is never smuggled into the URL — it is resolved per call.
  assertEquals(out.url, `${US}/api/sites/multiscreen`);
});

Deno.test("basic: test probes the site list on the US host by default", async () => {
  const { ctx, calls } = mockCtx([{
    body: { limit: 1, offset: 0, total_responses: 12, results: [{ site_name: "abc" }] },
  }]);
  const result = await auth.test({ credential: CRED }, ctx);

  assertEquals(result.ok, true);
  assertEquals(calls[0].url, `${US}/api/sites/multiscreen?limit=1`);
  // `sign` does not run for a standalone auth hook — the header is set here.
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("api-user:api-pass")}`);
  assert(/US region/.test(result.message!), result.message);
  assert(/12 site/.test(result.message!), result.message);
});

Deno.test("basic: test honours an EU region", async () => {
  const { ctx, calls } = mockCtx([{
    body: { limit: 1, offset: 0, total_responses: 0, results: [] },
  }]);
  const result = await auth.test({ credential: { ...CRED, region: "eu" } }, ctx);
  assertEquals(calls[0].url, `${EU}/api/sites/multiscreen?limit=1`);
  assertEquals(result.ok, true);
});

/**
 * The regression this app most needs: Duda's 401 has **no body at all** —
 * verified live on 2026-09-22, `content-length: 0` with only a
 * `WWW-Authenticate` header, on both regional hosts and several paths. So there
 * is no vendor error code to read, and the classification must not depend on
 * one, nor on echoing the credential back.
 */
Deno.test("basic: test classifies the real empty-body 401 as a rejected credential", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "www-authenticate": 'Basic realm="DM API"' },
  }]);
  const result = await auth.test({ credential: CRED }, ctx);

  assertEquals(result.ok, false);
  assertEquals(result.message, "Duda rejected the credential (HTTP 401)");
  assert(!result.message!.includes(btoa("api-user:api-pass")), result.message);
  assert(!result.message!.includes("api-pass"), result.message);
});

Deno.test("basic: test does not trust a bare 200 — the documented shape has to be there", async () => {
  // A captive portal / proxy answering 200 with HTML is the case this catches.
  const { ctx } = mockCtx([{ status: 200, body: "<html>ok</html>" }]);
  const result = await auth.test({ credential: CRED }, ctx);

  assertEquals(result.ok, false);
  assert(/not with the documented paginated site list/.test(result.message!), result.message);
});

Deno.test("basic: test also refuses an envelope missing total_responses", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { results: [] } }]);
  const result = await auth.test({ credential: CRED }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("basic: test reports a missing credential without calling out", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: { region: "US" } }, ctx);
  assertEquals(result.ok, false);
  assert(/missing/.test(result.message!), result.message);
  assertEquals(calls.length, 0);
});

Deno.test("basic: afterConnect records the region and nothing else", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.afterConnect!({ credential: { ...CRED, region: "EU" } }, ctx), {
    region: "EU",
  });
  // `test` has already proven the credential, so no second call is spent here.
  assertEquals(calls.length, 0);
});

Deno.test("basic: afterConnect normalises an unknown region onto US", async () => {
  const { ctx } = mockCtx([]);
  assertEquals(await auth.afterConnect!({ credential: { ...CRED, region: "apac" } }, ctx), {
    region: "US",
  });
});

Deno.test("basic: afterConnect output is what the connection label renders", async () => {
  const { ctx } = mockCtx([]);
  const display = await auth.afterConnect!({ credential: { ...CRED, region: "US" } }, ctx);
  assert(auth.connectionLabel!.includes("{{region}}"), auth.connectionLabel);
  assertEquals(display.region, "US");
});
