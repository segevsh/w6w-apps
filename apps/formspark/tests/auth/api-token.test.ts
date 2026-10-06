import { assert, assertEquals } from "@std/assert";
import apiToken from "../../auth/api-token.ts";
import { mockCtx, pathOf, problem, PROBLEM_HEADERS } from "../_helpers.ts";

const ME = {
  name: "CI",
  scopes: ["forms:read"],
  expiresAt: null,
  lastUsedAt: null,
  createdAt: "x",
};
// deno-lint-ignore no-explicit-any
const test = (cred: unknown, ctx: any) => (apiToken.test as any)({ credential: cred }, ctx);

Deno.test("auth: sign stamps the bearer header and nothing else", () => {
  // deno-lint-ignore no-explicit-any
  const out = (apiToken.sign as any)({
    request: { url: "u", method: "GET", headers: { accept: "x" } },
    credential: { apiToken: "fsk_live_abc" },
  });
  assertEquals(out.headers, { accept: "x", authorization: "Bearer fsk_live_abc" });
});

Deno.test("auth: declares a bearer method with one secret field", () => {
  assertEquals(apiToken.type, "bearer");
  assertEquals(apiToken.fields?.map((f) => [f.key, f.type]), [["apiToken", "secret"]]);
});

Deno.test("auth: test probes GET /me with the token and passes on a token description", async () => {
  const { ctx, calls } = mockCtx([{ body: ME }]);
  assertEquals(await test({ apiToken: " fsk_live_abc " }, ctx), { ok: true });
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/public/v1/me");
  assertEquals(calls[0].headers["authorization"], "Bearer fsk_live_abc");
});

Deno.test("auth: test never returns the token in its message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: PROBLEM_HEADERS,
    body: problem(401, "invalid_token", "The token is not valid."),
  }]);
  const r = await test({ apiToken: "fsk_live_SECRET" }, ctx);
  assert(!JSON.stringify(r).includes("fsk_live_SECRET"));
});

Deno.test("auth: test classifies by the problem code, not the status", async () => {
  const bad = mockCtx([{
    status: 401,
    headers: PROBLEM_HEADERS,
    body: problem(401, "invalid_token", "The token is not valid."),
  }]);
  const r1 = await test({ apiToken: "t" }, bad.ctx);
  assertEquals(r1.ok, false);
  assert(/rejected the token/.test(r1.message));

  // A 200 that is not a token description is not a pass.
  const shell = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await test({ apiToken: "t" }, shell.ctx)).ok, false);

  // A different vendor code is reported verbatim; an unrecognised body falls through.
  const other = mockCtx([{ status: 429, body: problem(429, "rate_limited", "Slow down") }]);
  assert((await test({ apiToken: "t" }, other.ctx)).message.includes("429 rate_limited"));
  const html = mockCtx([{ status: 502, body: "<html>", headers: { "content-type": "text/html" } }]);
  assertEquals(
    (await test({ apiToken: "t" }, html.ctx)).message,
    "Formspark returned HTTP 502 for /me",
  );
});

Deno.test("auth: test without a token fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await test({}, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});
