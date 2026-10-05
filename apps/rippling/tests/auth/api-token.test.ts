import { assertEquals, assertStringIncludes } from "@std/assert";
import apiToken, { authHeaders, isScopeRefusal, PROBE_PATH } from "../../auth/api-token.ts";
import { errorBody, mockCtx, queryOf } from "../_helpers.ts";
import type { HookContext } from "@w6w/types";

type Sign = (a: { request: { headers: Record<string, string> }; credential: unknown }) => {
  headers: Record<string, string>;
};

Deno.test("auth: bearer type with one secret field", () => {
  assertEquals(apiToken.type, "bearer");
  assertEquals(apiToken.fields?.length, 1);
  assertEquals(apiToken.fields?.[0].key, "apiToken");
  assertEquals(apiToken.fields?.[0].type, "secret");
});

Deno.test("sign: stamps Authorization: Bearer <token>, trimmed, and nothing else", () => {
  const req = { headers: { accept: "application/json" } };
  const out = (apiToken.sign as unknown as Sign)({
    request: req,
    credential: { apiToken: "  UOCgmwb123  " },
  });
  assertEquals(out.headers, { accept: "application/json", authorization: "Bearer UOCgmwb123" });
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

Deno.test("test: a 200 from GET /companies/?limit=1 is ok, and the token is sent in the header only", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [], next_link: null } }]);
  const res = await apiToken.test({ credential: { apiToken: "tok" } }, ctx);

  assertEquals(res, { ok: true });
  assertEquals(new URL(calls[0].url).pathname, PROBE_PATH);
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
  assertEquals(calls[0].url.includes("tok"), false);
});

Deno.test("test: the live 401 body ('Incorrect authentication credentials.') fails with a revocation hint", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Incorrect authentication credentials."),
  }]);
  const res = await apiToken.test({ credential: { apiToken: "bad" } }, ctx);
  assertEquals(res.ok, false);
  assertStringIncludes(res.message ?? "", "30 days");
  assertStringIncludes(res.message ?? "", "Incorrect authentication credentials.");
});

Deno.test("test: a 403 that names a scope means the token authenticated; any other 403 fails", async () => {
  const scoped = mockCtx([{
    status: 403,
    body: errorBody("Insufficient oauth scopes to access companies"),
  }]);
  const ok = await apiToken.test({ credential: { apiToken: "t" } }, scoped.ctx);
  assertEquals(ok.ok, true);
  assertStringIncludes(ok.message ?? "", "companies.read");

  const other = mockCtx([{ status: 403, body: errorBody("Forbidden") }]);
  assertEquals((await apiToken.test({ credential: { apiToken: "t" } }, other.ctx)).ok, false);

  assertEquals(isScopeRefusal(403, "Insufficient oauth scopes"), true);
  assertEquals(isScopeRefusal(401, "Insufficient oauth scopes"), false);
});

Deno.test("test: 429, 500 and a missing token each fail without a false pass", async () => {
  const rate = mockCtx([{ status: 429, body: {} }]);
  assertStringIncludes(
    (await apiToken.test({ credential: { apiToken: "t" } }, rate.ctx)).message ?? "",
    "429",
  );
  const boom = mockCtx([{ status: 500, body: "x" }]);
  const r = await apiToken.test({ credential: { apiToken: "t" } }, boom.ctx);
  assertEquals(r.ok, false);
  assertStringIncludes(r.message ?? "", "500");

  const none = mockCtx([]);
  assertEquals(await apiToken.test({ credential: {} }, none.ctx), {
    ok: false,
    message: "credential missing apiToken",
  });
  assertEquals(none.calls.length, 0);
});

Deno.test("afterConnect: publishes only the company name; any failure is silent", async () => {
  const good = mockCtx([{
    status: 200,
    body: { results: [{ name: "Acme Corporation", primary_email: "admin@acme.com" }] },
  }]);
  assertEquals(
    await apiToken.afterConnect!({ credential: { apiToken: "t" } } as never, good.ctx),
    { companyName: "Acme Corporation" },
  );
  const denied = mockCtx([{ status: 403, body: {} }]);
  assertEquals(
    await apiToken.afterConnect!({ credential: { apiToken: "t" } } as never, denied.ctx),
    {},
  );
  const throwing = {
    fetch: () => Promise.reject(new Error("net")),
    log: () => {},
  } as unknown as HookContext;
  assertEquals(
    await apiToken.afterConnect!({ credential: { apiToken: "t" } } as never, throwing),
    {},
  );
});
