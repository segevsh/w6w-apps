import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { SCOPE_HEADER } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

const CRED = { apiKey: "IST.key", siteId: "site-1", accountId: "acct-1" };

const req = (headers: Record<string, string> = {}) => ({
  url: "https://www.wixapis.com/wix-data/v2/collections",
  method: "GET",
  headers: { ...headers },
});

Deno.test("api-key: declares the credential field as a secret", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  const key = auth.fields!.find((f) => f.key === "apiKey")!;
  assertEquals(key.type, "secret");
  assertEquals(key.required, true);
  // The IDs are scoping data, not credentials — they must stay plain strings
  // so the connect form does not mask a value the user needs to check.
  assertEquals(auth.fields!.find((f) => f.key === "siteId")!.type, "string");
  assertEquals(auth.fields!.find((f) => f.key === "accountId")!.type, "string");
});

Deno.test("api-key: sends the key bare — Wix uses no Bearer prefix", () => {
  assertEquals(auth.apiKey, { in: "header", name: "Authorization", prefix: "" });
  const signed = auth.sign!(
    { request: req({ [SCOPE_HEADER]: "site" }), credential: CRED },
    // deno-lint-ignore no-explicit-any
    null as any,
  ) as { headers: Record<string, string> };
  assertEquals(signed.headers["Authorization"], "IST.key");
  assert(!signed.headers["Authorization"].startsWith("Bearer"));
});

Deno.test("api-key: a site-scoped request gets wix-site-id and NOT wix-account-id", () => {
  const signed = auth.sign!(
    { request: req({ [SCOPE_HEADER]: "site" }), credential: CRED },
    // deno-lint-ignore no-explicit-any
    null as any,
  ) as { headers: Record<string, string> };
  assertEquals(signed.headers["wix-site-id"], "site-1");
  assert(!("wix-account-id" in signed.headers), "Wix rejects both identity headers at once");
});

Deno.test("api-key: an account-scoped request gets wix-account-id and NOT wix-site-id", () => {
  const signed = auth.sign!(
    { request: req({ [SCOPE_HEADER]: "account" }), credential: CRED },
    // deno-lint-ignore no-explicit-any
    null as any,
  ) as { headers: Record<string, string> };
  assertEquals(signed.headers["wix-account-id"], "acct-1");
  assert(!("wix-site-id" in signed.headers), "Wix rejects both identity headers at once");
});

Deno.test("api-key: the internal scope marker never reaches Wix", () => {
  for (const scope of ["site", "account"]) {
    const signed = auth.sign!(
      { request: req({ [SCOPE_HEADER]: scope }), credential: CRED },
      // deno-lint-ignore no-explicit-any
      null as any,
    ) as { headers: Record<string, string> };
    const names = Object.keys(signed.headers).map((h) => h.toLowerCase());
    assert(!names.includes(SCOPE_HEADER), `marker leaked on a ${scope}-scoped request`);
  }
});

Deno.test("api-key: strips the marker whatever case it arrives in", () => {
  const signed = auth.sign!(
    { request: req({ "X-W6W-Wix-Scope": "account" }), credential: CRED },
    // deno-lint-ignore no-explicit-any
    null as any,
  ) as { headers: Record<string, string> };
  assert(!Object.keys(signed.headers).some((h) => h.toLowerCase() === SCOPE_HEADER));
  assertEquals(signed.headers["wix-account-id"], "acct-1");
});

Deno.test("api-key: defaults to site scope when no marker is present", () => {
  const signed = auth.sign!(
    { request: req(), credential: CRED },
    // deno-lint-ignore no-explicit-any
    null as any,
  ) as { headers: Record<string, string> };
  assertEquals(signed.headers["wix-site-id"], "site-1");
});

Deno.test("api-key: omits the identity header rather than sending an empty one", () => {
  const signed = auth.sign!(
    { request: req({ [SCOPE_HEADER]: "account" }), credential: { apiKey: "k", siteId: "s" } },
    // deno-lint-ignore no-explicit-any
    null as any,
  ) as { headers: Record<string, string> };
  assert(!("wix-account-id" in signed.headers));
  assert(!("wix-site-id" in signed.headers), "an account call must not fall back to the site id");
  assertEquals(signed.headers["Authorization"], "k");
});

Deno.test("api-key: test probes site properties when a site id is present", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { properties: {} } }]);
  assertEquals(await auth.test({ credential: CRED }, ctx), { ok: true });
  assertEquals(new URL(calls[0].url).pathname, "/site-properties/v4/properties");
  assertEquals(calls[0].headers["authorization"], "IST.key");
  assertEquals(calls[0].headers["wix-site-id"], "site-1");
});

Deno.test("api-key: test falls back to the account-level probe when only an account id is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sites: [] } }]);
  const out = await auth.test({ credential: { apiKey: "k", accountId: "acct-1" } }, ctx);
  assertEquals(out, { ok: true });
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/site-list/v2/sites/query");
  assertEquals(calls[0].headers["wix-account-id"], "acct-1");
});

Deno.test("api-key: test reports a dead credential rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 403, body: {} }]);
  assertEquals(await auth.test({ credential: CRED }, ctx), {
    ok: false,
    message: "Wix returned 403",
  });
});

Deno.test("api-key: test rejects an incomplete credential without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(await auth.test({ credential: { apiKey: "k" } }, ctx), {
    ok: false,
    message: "credential needs a siteId or an accountId",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect labels the connection with the site's real name", async () => {
  const { ctx } = mockCtx([{
    body: { properties: { siteDisplayName: "Ada's Shop", locale: "en-US", timeZone: "UTC" } },
  }]);
  assertEquals(await auth.afterConnect!({ credential: CRED }, ctx), {
    site: { id: "site-1", displayName: "Ada's Shop", locale: "en-US", timeZone: "UTC" },
  });
  assertEquals(auth.connectionLabel, "{{site.displayName}}");
});

Deno.test("api-key: afterConnect degrades quietly for an account-only credential", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.afterConnect!({ credential: { apiKey: "k" } }, ctx), {});
  assertEquals(calls.length, 0, "no site id means nothing to look up");
});

Deno.test("api-key: afterConnect degrades quietly when Wix refuses", async () => {
  const { ctx } = mockCtx([{ status: 403, body: {} }]);
  assertEquals(await auth.afterConnect!({ credential: CRED }, ctx), {});
});
