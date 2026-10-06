import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { detail, mockCtx, pathOf } from "../_helpers.ts";

type Req = { url: string; method: string; headers: Record<string, string> };

Deno.test("api-key: sign stamps a Bearer header and nothing else", () => {
  const req: Req = { url: "https://api.avoma.com/v1/users/", method: "GET", headers: {} };
  const out = auth.sign!(
    { request: req, credential: { apiKey: "k123" } } as never,
    mockCtx().ctx,
  ) as Req;
  assertEquals(out.headers["authorization"], "Bearer k123");
  assertEquals(Object.keys(out.headers), ["authorization"]);
});

Deno.test("api-key: test passes on a 200 from GET /v1/users/ with the hand-built header", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uuid: "u1" }] }]);
  const res = await auth.test!({ credential: { apiKey: " k123 " } } as never, ctx);
  assertEquals(res, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/users/");
  assertEquals(calls[0].headers["authorization"], "Bearer k123");
});

Deno.test("api-key: an 'Invalid Token' 401 is a rejected key, read from the body", async () => {
  const { ctx } = mockCtx([{ status: 401, body: detail("Invalid Token") }]);
  const res = await auth.test!({ credential: { apiKey: "bad" } } as never, ctx);
  assertEquals(res.ok, false);
  assert(/rejected/i.test(res.message ?? ""));
  assert((res.message ?? "").includes("Invalid Token"));
});

Deno.test("api-key: 'Auth missing' says the credential never reached the request", async () => {
  const { ctx } = mockCtx([{ status: 401, body: detail("Auth missing in header and cookie") }]);
  const res = await auth.test!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(res.ok, false);
  assert(/no credential/i.test(res.message ?? ""));
});

Deno.test("api-key: 403 and other statuses are reported, never passed", async () => {
  const forbidden = mockCtx([{ status: 403, body: detail("Forbidden") }]);
  const r1 = await auth.test!({ credential: { apiKey: "k" } } as never, forbidden.ctx);
  assertEquals(r1.ok, false);
  assert((r1.message ?? "").includes("403"));
  const down = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const r2 = await auth.test!({ credential: { apiKey: "k" } } as never, down.ctx);
  assertEquals(r2.ok, false);
  assert((r2.message ?? "").includes("502"));
});

Deno.test("api-key: a blank key fails without any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await auth.test!({ credential: { apiKey: "  " } } as never, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});
