import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "mc_SECRET" };
// deno-lint-ignore no-explicit-any
const test = (c: any, ctx: any) => auth.test!({ credential: c } as any, ctx);

Deno.test("sign: Token token=<key>, trimmed, plus the versioned Accept", async () => {
  const req = await auth.sign!({
    request: { url: "u", method: "GET", headers: {} },
    credential: { apiKey: "  mc_SECRET \n" },
    // deno-lint-ignore no-explicit-any
  } as any, {} as any);
  const h = (req as { headers: Record<string, string> }).headers;
  assertEquals(h.authorization, "Token token=mc_SECRET");
  assertEquals(h.accept, "application/vnd.moonclerk+json;version=1");
});

Deno.test("test: a 2xx with a forms list is ok; key only in the header", async () => {
  const { ctx, calls } = mockCtx([{ body: { forms: [] } }]);
  assertEquals(await test(cred, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.moonclerk.com/forms?count=1");
  assertEquals(calls[0].headers.authorization, "Token token=mc_SECRET");
});

Deno.test("test: a 2xx without a forms list is not ok", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await test(cred, ctx)).ok, false);
});

Deno.test("test: a 401 Access denied body is a rejected key, secret not echoed", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "HTTP Token: Access denied.\n",
  }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("rejected"));
  assert(!r.message!.includes("mc_SECRET"));
});

Deno.test("test: a 403/404 without the denied text is not called a bad key", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "Forbidden" }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(!r.message!.includes("rejected"));
  assert(r.message!.includes("403"));
});

Deno.test("test: 429, 5xx, network failure and a missing key are each reported", async () => {
  assert((await test(cred, mockCtx([{ status: 429, body: "slow" }]).ctx)).message!.includes("429"));
  assert((await test(cred, mockCtx([{ status: 503, body: "x" }]).ctx)).message!.includes("503"));
  const boom = { fetch: () => Promise.reject(new Error("dns")), log: () => {} };
  assert((await test(cred, boom)).message!.includes("could not reach"));
  assert((await test({ apiKey: " " }, mockCtx().ctx)).message!.includes("missing"));
});
