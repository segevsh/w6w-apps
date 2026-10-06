import { assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const KEY = "44784dd8d88be9631046ff83e9044419ff824b10";
const test = (ctx: ReturnType<typeof mockCtx>["ctx"], credential: unknown = { apiKey: KEY }) =>
  apiKey.test!({ credential } as never, ctx);

Deno.test("auth: wire value is base64(key + ':') — empty password", () => {
  assertEquals(authHeaders({ apiKey: KEY }).authorization, `Basic ${btoa(`${KEY}:`)}`);
});

Deno.test("auth: sign stamps the Basic header on the request", async () => {
  const req = await apiKey.sign!({
    request: { url: "https://api.printnode.com/computers", method: "GET", headers: {} },
    credential: { apiKey: KEY },
  } as never, mockCtx().ctx);
  assertEquals(
    (req as { headers: Record<string, string> }).headers.authorization,
    `Basic ${btoa(`${KEY}:`)}`,
  );
});

Deno.test("auth.test: a bare-string 200 from /noop is ok, and probes /noop not /whoami", async () => {
  const { ctx, calls } = mockCtx([{ body: "90c94065-8244-453d-a8d3-fa9a9ff775ff" }]);
  assertEquals(await test(ctx), { ok: true });
  assertEquals(new URL(calls[0].url).pathname, "/noop");
});

Deno.test("auth.test: a 200 that is not a string is not ok (SPA/shell guard)", async () => {
  const { ctx } = mockCtx([{ body: "<html></html>", raw: true, headers: {} }]);
  assertEquals((await test(ctx)).ok, false);
});

Deno.test("auth.test: classifies from the body message, not the status", async () => {
  const a = mockCtx([{ status: 401, body: errorBody("BadRequest", "API Key not found") }]);
  const ra = await test(a.ctx);
  assertEquals(ra.ok, false);
  assertEquals(/does not recognise/.test(ra.message ?? ""), true);

  const b = mockCtx([{
    status: 401,
    body: errorBody("BadRequest", "HTTP basic auth header ('Authorization') missing"),
  }]);
  assertEquals(/received no credentials/.test((await test(b.ctx)).message ?? ""), true);

  const c = mockCtx([{ status: 500, body: errorBody("InternalError", "boom") }]);
  assertEquals(/500 InternalError/.test((await test(c.ctx)).message ?? ""), true);
});

Deno.test("auth.test: missing key short-circuits without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test(ctx, {})).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth.afterConnect: keeps only email and account id; swallows failures", async () => {
  const { ctx } = mockCtx([{
    body: { id: 433, email: "a@b.co", firstname: "P", credits: 5 },
  }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } } as never, ctx), {
    email: "a@b.co",
    accountId: 433,
  });
  const bad = mockCtx([{ status: 401, body: errorBody("BadRequest", "x") }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } } as never, bad.ctx), {});
});
