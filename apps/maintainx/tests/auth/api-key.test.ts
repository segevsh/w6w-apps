import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const cred = { apiKey: "sekret.jwt.value" };
const orgs = { organizations: [{ id: 15, name: "Acme Plant" }], nextCursor: null };

Deno.test("api-key: sign stamps the bearer header", () => {
  const out = apiKey.sign!({
    request: { url: "https://api.getmaintainx.com/v1/assets", method: "GET", headers: {} },
    credential: cred,
  } as never, {} as never) as { headers: Record<string, string> };
  assertEquals(out.headers.authorization, "Bearer sekret.jwt.value");
});

Deno.test("api-key: declared as a bearer method with one secret field", () => {
  assertEquals(apiKey.type, "bearer");
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].type, "secret");
});

Deno.test("api-key: test probes GET /organizations and accepts the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: orgs }]);
  assertEquals(await apiKey.test({ credential: cred } as never, ctx), { ok: true });
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/organizations");
  assertEquals(calls[0].headers.authorization, "Bearer sekret.jwt.value");
});

Deno.test("api-key: a 200 that is not an organizations list is not a pass", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const r = await apiKey.test({ credential: cred } as never, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("documented shape"));
});

Deno.test("api-key: a JSON {error} 401 is a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Invalid token" } }]);
  const r = await apiKey.test({ credential: cred } as never, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("rejected the API key"));
  assert(r.message?.includes("Invalid token"));
});

Deno.test("api-key: the plain-text 401 means the credential never reached the request", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: "Invalid authentication token",
    headers: { "content-type": "text/html" },
  }]);
  const r = await apiKey.test({ credential: cred } as never, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("no usable token"));
});

Deno.test("api-key: 403 and 5xx are reported distinctly", async () => {
  const a = mockCtx([{ status: 403, body: { error: "Forbidden" } }]);
  assert((await apiKey.test({ credential: cred } as never, a.ctx)).message?.includes("403"));
  const b = mockCtx([{
    status: 502,
    body: "bad gateway",
    headers: { "content-type": "text/plain" },
  }]);
  assert((await apiKey.test({ credential: cred } as never, b.ctx)).message?.includes("HTTP 502"));
});

Deno.test("api-key: a missing key fails without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await apiKey.test({ credential: { apiKey: "  " } } as never, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect publishes only the organization name, silently on failure", async () => {
  const ok = mockCtx([{ body: orgs }]);
  assertEquals(await apiKey.afterConnect!({ credential: cred } as never, ok.ctx), {
    organization: "Acme Plant",
  });
  const bad = mockCtx([{ status: 401, body: { error: "Invalid token" } }]);
  assertEquals(await apiKey.afterConnect!({ credential: cred } as never, bad.ctx), {});
});
