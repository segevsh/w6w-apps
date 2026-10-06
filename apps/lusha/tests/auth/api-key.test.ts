import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "SECRET" };
// deno-lint-ignore no-explicit-any
const test = (c: any, ctx: any) => auth.test!({ credential: c } as any, ctx);

Deno.test("sign: sets the api_key header", async () => {
  // deno-lint-ignore no-explicit-any
  const req = await auth.sign!({ request: { headers: {} }, credential: cred } as any, {} as any);
  assertEquals((req as { headers: Record<string, string> }).headers.api_key, "SECRET");
});

Deno.test("test: a 2xx with credits is ok; key only in the header", async () => {
  const { ctx, calls } = mockCtx([{ body: { credits: { total: 1, used: 0, remaining: 1 } } }]);
  assertEquals(await test(cred, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.lusha.com/v3/account/usage");
  assertEquals(calls[0].headers.api_key, "SECRET");
});

Deno.test("test: a 2xx without credits (HTML shell) is not ok", async () => {
  assertEquals((await test(cred, mockCtx([{ body: { hello: 1 } }]).ctx)).ok, false);
  assertEquals((await test(cred, mockCtx([{ body: "<html></html>" }]).ctx)).ok, false);
});

Deno.test("test: classified from the body — 401 invalid key, 400 bad format, missing header", async () => {
  const a = await test(
    cred,
    mockCtx([{
      status: 401,
      body: { statusCode: 401, message: "Invalid API key", error: "Unauthorized" },
    }]).ctx,
  );
  assertEquals(a, { ok: false, message: "Invalid API key" });
  const b = await test(
    cred,
    mockCtx([{
      status: 400,
      body: { statusCode: 400, message: "Invalid API key format", error: "Bad Request" },
    }]).ctx,
  );
  assert(b.message!.includes("format"));
  const c = await test(
    cred,
    mockCtx([{
      status: 401,
      body: {
        statusCode: 401,
        error: "invalid_request",
        error_description: "missing Authorization header",
      },
    }]).ctx,
  );
  assert(c.message!.includes("missing"));
});

Deno.test("test: non-error body, 5xx, 429, unreachable, missing key", async () => {
  assert(
    (await test(cred, mockCtx([{ status: 403, body: "<html>x</html>" }]).ctx)).message!.includes(
      "non-error body",
    ),
  );
  assert(
    (await test(cred, mockCtx([{ status: 503, body: { statusCode: 503, message: "down" } }]).ctx))
      .message!.includes("erroring"),
  );
  assert(
    (await test(cred, mockCtx([{ status: 429, body: { statusCode: 429, message: "slow" } }]).ctx))
      .message!.includes("rate-limited"),
  );
  assertEquals((await test(cred, mockCtx([]).ctx)).ok, false);
  assertEquals((await test({}, mockCtx([]).ctx)).ok, false);
});

Deno.test("afterConnect: records the plan category, falls back on failure", async () => {
  // deno-lint-ignore no-explicit-any
  const run = (ctx: any) => auth.afterConnect!({ credential: cred } as any, ctx);
  assertEquals(await run(mockCtx([{ body: { plan: { category: "professional" } } }]).ctx), {
    plan: "professional",
  });
  assertEquals(await run(mockCtx([{ status: 401, body: {} }]).ctx), { plan: "API" });
  assertEquals(await run(mockCtx([]).ctx), { plan: "API" });
});
