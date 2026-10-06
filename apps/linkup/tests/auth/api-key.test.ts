import { assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiKey, { probeRequest } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const UNAUTH = {
  statusCode: 401,
  error: { code: "UNAUTHORIZED", details: [], message: "Unauthorized action" },
};

Deno.test("sign: stamps a Bearer header and nothing else", async () => {
  const req = await apiKey.sign!({
    request: { url: "https://api.linkup.so/v1/search", method: "POST", headers: { a: "b" } },
    credential: { apiKey: " lk_123 " },
  }, {} as HookContext);
  assertEquals(req.headers, { a: "b", authorization: "Bearer lk_123" });
  assertEquals(req.url, "https://api.linkup.so/v1/search");
});

Deno.test("probe: the free balance read", () => {
  const p = probeRequest();
  assertEquals(p.url, "https://api.linkup.so/v1/credits/balance");
  assertEquals(p.method, "GET");
});

Deno.test("test: a balance number is a live key", async () => {
  const { ctx, calls } = mockCtx([{ body: { balance: 10 } }]);
  assertEquals(await apiKey.test!({ credential: { apiKey: "k" } }, ctx), { ok: true });
  assertEquals(calls[0].headers["authorization"], "Bearer k");
  assertEquals(calls[0].url, "https://api.linkup.so/v1/credits/balance");
});

Deno.test("test: a 200 without a balance is not proof of a live key", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const r = await apiKey.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
});

Deno.test("test: the vendor's UNAUTHORIZED code is a rejection", async () => {
  const { ctx } = mockCtx([{ status: 401, body: UNAUTH }]);
  const r = await apiKey.test!({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(/rejected the API key/.test(r.message ?? ""), true);
  // the same code is a rejection whatever status carries it
  const odd = mockCtx([{ status: 400, body: UNAUTH }]);
  assertEquals((await apiKey.test!({ credential: { apiKey: "bad" } }, odd.ctx)).ok, false);
});

Deno.test("test: 429, other statuses and an empty credential", async () => {
  const a = mockCtx([{ status: 429, body: { error: { code: "TOO_MANY_REQUESTS" } } }]);
  assertEquals(
    /rate-limited/.test((await apiKey.test!({ credential: { apiKey: "k" } }, a.ctx)).message ?? ""),
    true,
  );
  const b = mockCtx([{ status: 503, body: "down" }]);
  assertEquals(
    /HTTP 503: down/.test(
      (await apiKey.test!({ credential: { apiKey: "k" } }, b.ctx)).message ?? "",
    ),
    true,
  );
  const c = mockCtx([]);
  assertEquals((await apiKey.test!({ credential: { apiKey: " " } }, c.ctx)).ok, false);
  assertEquals(c.calls.length, 0);
});

Deno.test("auth: declares a header apiKey with one secret field", () => {
  assertEquals(apiKey.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
  assertEquals(apiKey.fields?.map((f) => [f.key, f.type]), [["apiKey", "secret"]]);
});
