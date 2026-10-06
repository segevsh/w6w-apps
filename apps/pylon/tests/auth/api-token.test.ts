import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-token.ts";
import { mockCtx } from "../_helpers.ts";

const cred = (extra: Record<string, unknown> = {}) => ({
  apiKey: "SECRET",
  region: "us",
  ...extra,
});
// deno-lint-ignore no-explicit-any
const test = (c: any, ctx: any) => auth.test!({ credential: c } as any, ctx);

Deno.test("sign: sets a Bearer authorization header", async () => {
  // deno-lint-ignore no-explicit-any
  const req = await auth.sign!({ request: { headers: {} }, credential: cred() } as any, {} as any);
  assertEquals((req as { headers: Record<string, string> }).headers.authorization, "Bearer SECRET");
});

Deno.test("test: a 2xx with data.id is ok and the token is not echoed in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "org" } } }]);
  assertEquals(await test(cred(), ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.usepylon.com/me");
  assertEquals(calls[0].headers.authorization, "Bearer SECRET");
});

Deno.test("test: a 2xx without data.id is not ok", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const r = await test(cred(), ctx);
  assertEquals(r.ok, false);
});

Deno.test("test: EU region hits the EU host", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "o" } } }]);
  await test(cred({ region: "eu" }), ctx);
  assertEquals(calls[0].url, "https://api.eu.usepylon.com/me");
});

Deno.test("test: classifies by code, not status", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { errors: ["Invalid API token!"], code: "invalid_api_token" },
  }]);
  const r1 = await test(cred(), bad.ctx);
  assertEquals(r1.ok, false);
  assert(r1.message!.includes("invalid_api_token"));
  assert(!r1.message!.includes("SECRET"));

  const denied = mockCtx([{ status: 403, body: { errors: ["no"], code: "permission_denied" } }]);
  assertEquals(await test(cred(), denied.ctx), { ok: true });

  const wrong = mockCtx([{ status: 401, body: { errors: ["x"], code: "wrong_region_token" } }]);
  const r2 = await test(cred(), wrong.ctx);
  assertEquals(r2.ok, false);
  assert(r2.message!.includes("other region"));
});

Deno.test("test: a non-JSON or non-error body is not trusted", async () => {
  const html = mockCtx([{ status: 200, body: "<html>captive portal</html>" }]);
  assertEquals((await test(cred(), html.ctx)).ok, false);
  const blank = mockCtx([{ status: 403, body: "<html>blocked</html>" }]);
  const r = await test(cred(), blank.ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("non-error body"));
});

Deno.test("test: 5xx reports Pylon erroring, network failure and missing key fail", async () => {
  const five = mockCtx([{ status: 503, body: { errors: ["down"], code: "internal" } }]);
  assert((await test(cred(), five.ctx)).message!.includes("erroring"));
  const { ctx } = mockCtx([]);
  const r = await test(cred(), ctx);
  assertEquals(r.ok, false);
  assertEquals((await test({ region: "us" }, ctx)).message, "credential missing apiKey");
});

Deno.test("afterConnect: records region and organization name", async () => {
  const { ctx } = mockCtx([{ body: { data: { id: "o", name: "Acme" } } }]);
  // deno-lint-ignore no-explicit-any
  const out = await auth.afterConnect!({ credential: cred({ region: "eu" }) } as any, ctx);
  assertEquals(out, { region: "eu", organization: "Acme" });
});

Deno.test("afterConnect: falls back to Pylon when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["x"] } }]);
  // deno-lint-ignore no-explicit-any
  const out = await auth.afterConnect!({ credential: cred() } as any, ctx);
  assertEquals(out, { region: "us", organization: "Pylon" });
});
