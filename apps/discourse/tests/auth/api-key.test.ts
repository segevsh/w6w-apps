import { assert, assertEquals } from "@std/assert";
import auth, { authHeaders } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const CRED = {
  siteUrl: "https://forum.example.com/",
  apiKey: "714552c6148e1617aeab526d0606184b94a80ec048fc09894ff1a72b740c5f19",
  apiUsername: "system",
};

Deno.test("auth: declares the api-key type and the header the key goes in", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "Api-Key");
  // Discourse takes the raw key with no scheme word, stated explicitly.
  assertEquals(auth.apiKey?.prefix, "");
});

Deno.test("auth: sign stamps BOTH headers, on every method and path", () => {
  for (const method of ["GET", "POST", "PUT", "DELETE"]) {
    const request = { method, url: "https://forum.example.com/t/1.json", headers: {} };
    const signed = auth.sign!({ request, credential: CRED } as never, undefined as never) as {
      headers: Record<string, string>;
    };
    assertEquals(signed.headers["Api-Key"], CRED.apiKey);
    assertEquals(signed.headers["Api-Username"], "system");
    // Discourse does not use Authorization at all.
    assertEquals(signed.headers["authorization"], undefined);
    assertEquals(signed.headers["Authorization"], undefined);
  }
});

Deno.test("auth: sign preserves headers the client already set", () => {
  const request = {
    method: "POST",
    url: "https://forum.example.com/posts.json",
    headers: { accept: "application/json", "content-type": "application/json" },
  };
  const signed = auth.sign!({ request, credential: CRED } as never, undefined as never) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers["accept"], "application/json");
  assertEquals(signed.headers["content-type"], "application/json");
  assertEquals(signed.headers["Api-Key"], CRED.apiKey);
});

Deno.test("authHeaders: the one place the wire format is built", () => {
  assertEquals(authHeaders(CRED), {
    "Api-Key": CRED.apiKey,
    "Api-Username": "system",
  });
  // A partial credential still yields both keys, so a probe never silently
  // sends one header and omits the other.
  assertEquals(authHeaders({}), { "Api-Key": "", "Api-Username": "" });
});

Deno.test("auth: fields are siteUrl, apiKey, apiUsername — and only the key is masked", () => {
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["siteUrl", "apiKey", "apiUsername"]);
  assertEquals(fields.every((f) => f.required), true);
  assertEquals(fields.find((f) => f.key === "apiKey")?.type, "secret");
  // `system` is Discourse's built-in automation account and the reference's own
  // example value, so it is the default rather than a blank the user must guess.
  assertEquals(fields.find((f) => f.key === "apiUsername")?.default, "system");
});

Deno.test("auth: test probes the acting user's own record, unsigned URL built from siteUrl", async () => {
  const { ctx, calls } = mockCtx([{ body: { user: { id: 1, username: "system" } } }]);
  const result = await auth.test!({ credential: CRED } as never, ctx);
  assertEquals(result.ok, true);
  // The trailing slash on the credential's siteUrl must not survive.
  assertEquals(calls[0].url, "https://forum.example.com/u/system.json");
  assertEquals(calls[0].headers["api-key"], CRED.apiKey);
  assertEquals(calls[0].headers["api-username"], "system");
});

Deno.test("auth: test URL-encodes the username rather than concatenating it", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await auth.test!({ credential: { ...CRED, apiUsername: "a b/c" } } as never, ctx);
  assertEquals(calls[0].url, "https://forum.example.com/u/a%20b%2Fc.json");
});

Deno.test("auth: test reports a rejected key on 403, not just on 401", async () => {
  // Discourse answers 403 for a bad API key. Treating only 401 as a credential
  // failure would misreport every one of them.
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{ status, body: { errors: ["You are not permitted"] } }]);
    const result = await auth.test!({ credential: CRED } as never, ctx);
    assertEquals(result.ok, false);
    assert(result.message!.includes(String(status)));
    assert(result.message!.includes("Single User"));
  }
});

Deno.test("auth: test tells a missing user apart from a bad key", async () => {
  const { ctx } = mockCtx([{ status: 404, body: {} }]);
  const result = await auth.test!({ credential: { ...CRED, apiUsername: "ghost" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("ghost"));
});

Deno.test("auth: test refuses an incomplete credential before touching the network", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(
    (await auth.test!({ credential: { apiKey: "k", apiUsername: "u" } } as never, ctx)).ok,
    false,
  );
  assertEquals(
    (await auth.test!(
      { credential: { siteUrl: "https://a.test", apiUsername: "u" } } as never,
      ctx,
    ))
      .ok,
    false,
  );
  const noUser = await auth.test!(
    { credential: { siteUrl: "https://a.test", apiKey: "k" } } as never,
    ctx,
  );
  assertEquals(noUser.ok, false);
  assert(noUser.message!.includes("Api-Username"));
  assertEquals(calls.length, 0, "an incomplete credential must not hit the network");
});

Deno.test("auth: test reports an unusable site URL rather than throwing", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!({ credential: { ...CRED, siteUrl: "   " } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth: afterConnect publishes a normalised origin and no credential", () => {
  const display = auth.afterConnect!(
    { credential: { ...CRED, siteUrl: "forum.example.com/latest" } } as never,
    undefined as never,
  ) as Record<string, unknown>;
  assertEquals(display.siteUrl, "https://forum.example.com");
  assertEquals(display.site, { host: "forum.example.com" });
  assertEquals(display.user, { username: "system" });
  // The key must never reach redacted connection metadata.
  assert(!JSON.stringify(display).includes(CRED.apiKey));
});

Deno.test("auth: afterConnect degrades to empty rather than throwing on a bad URL", () => {
  assertEquals(
    auth.afterConnect!(
      { credential: { ...CRED, siteUrl: "https://" } } as never,
      undefined as never,
    ),
    {},
  );
  assertEquals(auth.afterConnect!({ credential: {} } as never, undefined as never), {});
});
