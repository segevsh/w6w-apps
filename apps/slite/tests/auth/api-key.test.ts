import { assert, assertEquals } from "@std/assert";
import auth, { authHeaders } from "../../auth/api-key.ts";
import { mockCtx, pathOf, slError } from "../_helpers.ts";

type Req = { url: string; method: string; headers: Record<string, string> };

const ME = { email: "a@b.c", displayName: "A", organizationName: "O", organizationDomain: "b.c" };

Deno.test("api-key: declares an apiKey method on the x-slite-api-key header", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.name, "x-slite-api-key");
  assertEquals(auth.fields?.[0].type, "secret");
});

Deno.test("api-key: sign stamps both documented headers with the same key and nothing else", () => {
  const req: Req = { url: "https://api.slite.com/v1/me", method: "GET", headers: {} };
  const out = auth.sign!(
    { request: req, credential: { apiKey: "k123" } } as never,
    mockCtx().ctx,
  ) as Req;
  assertEquals(out.headers["x-slite-api-key"], "k123");
  assertEquals(out.headers["authorization"], "Bearer k123");
  assertEquals(Object.keys(out.headers).sort(), ["authorization", "x-slite-api-key"]);
  assertEquals(authHeaders({}), { "x-slite-api-key": "", authorization: "Bearer " });
});

Deno.test("api-key: test passes only on a 200 /v1/me profile body, with the hand-built headers", async () => {
  const { ctx, calls } = mockCtx([{ body: ME }]);
  const res = await auth.test!({ credential: { apiKey: " k123 " } } as never, ctx);
  assertEquals(res, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/me");
  assertEquals(calls[0].headers["x-slite-api-key"], "k123");
  assertEquals(calls[0].headers["authorization"], "Bearer k123");
});

Deno.test("api-key: a 200 that is not a profile (an edge shell) is not a pass", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const res = await auth.test!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(res.ok, false);
  assert((res.message ?? "").includes("without a profile body"));
});

Deno.test("api-key: auth/unauthorized is a rejected key, read from the body", async () => {
  const { ctx } = mockCtx([{ status: 401, body: slError("auth/unauthorized", "Invalid apiKey") }]);
  const res = await auth.test!({ credential: { apiKey: "bad" } } as never, ctx);
  assertEquals(res.ok, false);
  assert(/rejected/i.test(res.message ?? ""));
  assert((res.message ?? "").includes("Invalid apiKey"));
});

Deno.test("api-key: the vendor id decides even when the status is unexpected", async () => {
  const { ctx } = mockCtx([{ status: 403, body: slError("auth/unauthorized", "Invalid apiKey") }]);
  const res = await auth.test!({ credential: { apiKey: "bad" } } as never, ctx);
  assert(/rejected/i.test(res.message ?? ""));
});

Deno.test("api-key: a rate limit and other statuses are reported, never passed", async () => {
  const limited = mockCtx([{ status: 429, body: slError("rate-limit", "slow down") }]);
  const r1 = await auth.test!({ credential: { apiKey: "k" } } as never, limited.ctx);
  assertEquals(r1.ok, false);
  assert(/rate-limited/i.test(r1.message ?? ""));
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
