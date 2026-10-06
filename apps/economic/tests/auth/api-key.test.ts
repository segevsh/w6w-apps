import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = (extra: Record<string, unknown> = {}) => ({
  appSecretToken: "APPSECRET",
  agreementGrantToken: "GRANT",
  ...extra,
});
// deno-lint-ignore no-explicit-any
const test = (c: any, ctx: any) => auth.test!({ credential: c } as any, ctx);

Deno.test("sign: sets both token headers", async () => {
  // deno-lint-ignore no-explicit-any
  const req = await auth.sign!({ request: { headers: {} }, credential: cred() } as any, {} as any);
  const h = (req as { headers: Record<string, string> }).headers;
  assertEquals(h["x-appsecrettoken"], "APPSECRET");
  assertEquals(h["x-agreementgranttoken"], "GRANT");
});

Deno.test("test: a 2xx with a numeric agreementNumber is ok, tokens only in headers", async () => {
  const { ctx, calls } = mockCtx([{ body: { agreementNumber: 1, company: { name: "A" } } }]);
  assertEquals(await test(cred(), ctx), { ok: true });
  assertEquals(calls[0].url, "https://restapi.e-conomic.com/self");
  assertEquals(calls[0].headers["x-appsecrettoken"], "APPSECRET");
  assertEquals(calls[0].headers["x-agreementgranttoken"], "GRANT");
});

Deno.test("test: a 2xx without an agreement is not ok", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await test(cred(), ctx)).ok, false);
});

Deno.test("test: a rejected grant surfaces the vendor message and code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { message: "Token does not correspond to a valid grant.", errorCode: "E02250" },
  }]);
  const r = await test(cred(), ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("valid grant") && r.message!.includes("E02250"));
});

Deno.test("test: a 400 is judged by its body too, a non-error body is not trusted", async () => {
  const bad = mockCtx([{ status: 400, body: { message: "Bad token." } }]);
  assert((await test(cred(), bad.ctx)).message!.includes("Bad token."));
  const html = mockCtx([{ status: 403, body: "<html>blocked</html>" }]);
  assert((await test(cred(), html.ctx)).message!.includes("non-error body"));
});

Deno.test("test: 5xx, unreachable and missing tokens are reported", async () => {
  const five = mockCtx([{ status: 503, body: { message: "down" } }]);
  assert((await test(cred(), five.ctx)).message!.includes("erroring"));
  assert((await test(cred(), mockCtx([]).ctx)).message!.includes("could not reach"));
  assertEquals((await test(cred({ appSecretToken: "" }), mockCtx([]).ctx)).ok, false);
  assertEquals((await test(cred({ agreementGrantToken: "" }), mockCtx([]).ctx)).ok, false);
});

Deno.test("afterConnect: records company and agreement; falls back when /self fails", async () => {
  // deno-lint-ignore no-explicit-any
  const after = (ctx: any) => auth.afterConnect!({ credential: cred() } as any, ctx);
  const ok = mockCtx([{ body: { agreementNumber: 5, company: { name: "Demo Company" } } }]);
  assertEquals(await after(ok.ctx), { company: "Demo Company", agreementNumber: 5 });
  assertEquals(await after(mockCtx([]).ctx), { company: "e-conomic", agreementNumber: "" });
});
