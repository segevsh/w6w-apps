import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH, probeHeaders } from "../../auth/api-key.ts";
import { API_ROOT, errorBody, mockCtx } from "../_helpers.ts";

const PROFILE = { id: "5e4a1b2c3d4e5f60718293a4", title: "My Store", siteId: "S1" };

Deno.test("api-key: is a bearer method with one secret field and a sign hook", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "bearer");
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].key, "apiKey");
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(apiKey.fields?.[0].required, true);
  assert(typeof apiKey.sign === "function");
  assert(typeof apiKey.test === "function");
});

Deno.test("api-key: sign stamps Authorization: Bearer and nothing else", () => {
  const request = { url: `${API_ROOT}${PROBE_PATH}`, method: "GET", headers: {} };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: "secret-key" } } as never,
    {} as never,
  ) as { url: string; headers: Record<string, string> };

  assertEquals(signed.headers.authorization, "Bearer secret-key");
  // The key never reaches the URL — hosts log URLs, not headers.
  assertEquals(signed.url.includes("secret-key"), false);
});

Deno.test("api-key: sign tolerates a credential the user left blank", () => {
  const request = { url: `${API_ROOT}${PROBE_PATH}`, method: "GET", headers: {} };
  const signed = apiKey.sign!({ request, credential: {} } as never, {} as never) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, "Bearer ");
});

Deno.test("api-key: test probes GET /1.0/authorization/website and sends User-Agent", async () => {
  const { ctx, calls } = mockCtx([{ body: PROFILE }]);
  const out = await apiKey.test({ credential: { apiKey: "secret-key" } }, ctx);

  assertEquals(out.ok, true);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/1.0/authorization/website`);
  assertEquals(calls[0].headers.authorization, "Bearer secret-key");
  assertEquals(calls[0].headers["user-agent"], "w6w-squarespace-commerce/1.0");
  assertEquals(PROBE_PATH, "/1.0/authorization/website");
});

Deno.test("api-key: test classifies a rejected key from the AUTHORIZATION_ERROR body", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("AUTHORIZATION_ERROR") }]);
  const out = await apiKey.test({ credential: { apiKey: "bad" } }, ctx);

  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("AUTHORIZATION_ERROR"), true);
  // The message must never quote the credential.
  assertEquals(out.message?.includes("bad"), false);
  assertEquals(out.message?.includes("secret"), false);
});

Deno.test("api-key: test does not trust a 200 that is not a website profile", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const out = await apiKey.test({ credential: { apiKey: "k" } }, ctx);

  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("not with a website profile"), true);
});

Deno.test("api-key: test names a WEBSITE_EXPIRED body rather than calling it a bad key", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("WEBSITE_EXPIRED", { message: "The website is expired" }),
  }]);
  const out = await apiKey.test({ credential: { apiKey: "k" } }, ctx);

  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("website is expired"), true);
});

Deno.test("api-key: test reports a 429 as rate limiting, not as a bad credential", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "" }]);
  const out = await apiKey.test({ credential: { apiKey: "k" } }, ctx);

  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("rate-limited"), true);
});

Deno.test("api-key: test refuses an empty credential without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiKey.test({ credential: {} }, ctx);

  assertEquals(out.ok, false);
  assertEquals(out.message, "credential missing apiKey");
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect publishes the site title and id only", async () => {
  const { ctx } = mockCtx([{
    body: { ...PROFILE, currency: "USD", url: "https://x.squarespace.com" },
  }]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: "k" } }, ctx);

  assertEquals(out, { siteTitle: "My Store", siteId: "S1" });
});

Deno.test("api-key: afterConnect stays silent when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("AUTHORIZATION_ERROR") }]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(out, {});
});

Deno.test("api-key: authHeaders and probeHeaders build the same wire shape", () => {
  assertEquals(authHeaders("abc"), { authorization: "Bearer abc" });
  assertEquals(probeHeaders("abc"), {
    accept: "application/json",
    "user-agent": "w6w-squarespace-commerce/1.0",
    authorization: "Bearer abc",
  });
});
