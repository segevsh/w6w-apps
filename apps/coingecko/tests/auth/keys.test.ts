import { assert, assertEquals } from "@std/assert";
import type { AuthDefinition } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import demo from "../../auth/demo-api-key.ts";
import pro from "../../auth/pro-api-key.ts";

type Req = { url: string; method: string; headers: Record<string, string> };
type Hooks = {
  sign: (a: { request: Req; credential: unknown }) => Req;
  test: (a: { credential: unknown }, ctx: unknown) => Promise<{ ok: boolean; message?: string }>;
};
const sign = (a: AuthDefinition, request: Req, apiKey = "CG-k"): Req =>
  (a as unknown as Hooks).sign({ request, credential: { apiKey } });
const test = (a: AuthDefinition, ctx: unknown, apiKey: string | undefined = "CG-k") =>
  (a as unknown as Hooks).test({ credential: { apiKey } }, ctx);

const base = () => ({
  url: "https://api.coingecko.com/api/v3/ping",
  method: "GET",
  headers: {} as Record<string, string>,
});

Deno.test("demo sign: stamps x-cg-demo-api-key and keeps the demo host", () => {
  const out = sign(demo, base());
  assertEquals(out.headers["x-cg-demo-api-key"], "CG-k");
  assertEquals(out.url, "https://api.coingecko.com/api/v3/ping");
});

Deno.test("pro sign: stamps x-cg-pro-api-key and rewrites the host", () => {
  const out = sign(pro, base());
  assertEquals(out.headers["x-cg-pro-api-key"], "CG-k");
  assert(!("x-cg-demo-api-key" in out.headers));
  assertEquals(out.url, "https://pro-api.coingecko.com/api/v3/ping");
});

Deno.test("pro sign: leaves a URL already on the pro host alone", () => {
  const r = { ...base(), url: "https://pro-api.coingecko.com/api/v3/key" };
  assertEquals(sign(pro, r).url, "https://pro-api.coingecko.com/api/v3/key");
});

Deno.test("test: ok on gecko_says; the key goes out in the plan's header on the plan's host", async () => {
  const d = mockCtx([{ status: 200, body: { gecko_says: "(V3) To the Moon!" } }]);
  assertEquals((await test(demo, d.ctx)).ok, true);
  assertEquals(d.calls[0].url, "https://api.coingecko.com/api/v3/ping");
  assertEquals(d.calls[0].headers["x-cg-demo-api-key"], "CG-k");

  const p = mockCtx([{ status: 200, body: { gecko_says: "ok" } }]);
  assertEquals((await test(pro, p.ctx)).ok, true);
  assertEquals(p.calls[0].url, "https://pro-api.coingecko.com/api/v3/ping");
  assertEquals(p.calls[0].headers["x-cg-pro-api-key"], "CG-k");
});

Deno.test("test: a 10002 body is a rejected key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { status: { error_code: 10002, error_message: "API Key Missing. Please" } },
  }]);
  const r = await test(pro, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("did not accept this pro API key"));
});

Deno.test("test: a 10010 body points at the other plan's method, whatever the status", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error_code: 10010, status: { error_message: "change your root URL" } },
  }]);
  const r = await test(demo, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("Pro API Key"));
});

Deno.test("test: a 200 without gecko_says is not a pass; a 5xx is reported verbatim", async () => {
  const a = mockCtx([{ status: 200, body: "<html>shell</html>" }]);
  assertEquals((await test(demo, a.ctx)).ok, false);
  const b = mockCtx([{ status: 503, body: "upstream down" }]);
  const r = await test(demo, b.ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("503"));
});

Deno.test("test: missing apiKey fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test(demo, ctx, "")).ok, false);
  assertEquals(calls.length, 0);
});
