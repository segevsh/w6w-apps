import { assert, assertEquals } from "@std/assert";
import apiKey, { PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const test = (r: Parameters<typeof mockCtx>[0], key = "k") => {
  const m = mockCtx(r);
  return { m, res: apiKey.test!({ credential: { apiKey: key } } as never, m.ctx) };
};

Deno.test("auth: sign stamps X-Api-Key and nothing else", () => {
  const request = { url: "https://gateway.seven.io/api/sms", method: "GET", headers: {} } as never;
  const out = apiKey.sign!(
    { request, credential: { apiKey: "secret" } } as never,
    mockCtx().ctx,
  ) as {
    headers: Record<string, string>;
  };
  assertEquals(out.headers, { "x-api-key": "secret" });
});

Deno.test("auth: a balance object is a live key, probed with the key in a header only", async () => {
  const { m, res } = test([{ body: { amount: 12.35, currency: "EUR" } }], "abc123");
  assertEquals(await res, { ok: true });
  assertEquals(pathOf(m.calls[0].url), `/api${PROBE_PATH}`);
  assertEquals(m.calls[0].headers["x-api-key"], "abc123");
  assertEquals(new URL(m.calls[0].url).search, "");
});

Deno.test("auth: bare 900 in an HTTP 200 is rejected, classified from the body", async () => {
  for (const body of ['"900"', "900"]) {
    const out = await test([{ body }]).res;
    assertEquals(out.ok, false);
    assert(out.message?.includes("900"), out.message);
  }
});

Deno.test("auth: 902 (no scope for balance) is a recognised key; 903 and 901 are not", async () => {
  assertEquals(await test([{ body: '"902"' }]).res, { ok: true });
  const ip = await test([{ body: '"903"' }]).res;
  assertEquals(ip.ok, false);
  assert(ip.message?.includes("allow-list"), ip.message);
  assertEquals((await test([{ body: '"901"' }]).res).ok, false);
});

Deno.test("auth: a 200 that is neither a balance nor a code is not accepted", async () => {
  assertEquals((await test([{ body: { hello: "world" } }]).res).ok, false);
  assertEquals((await test([{ status: 502, body: "bad gateway", headers: {} }]).res).ok, false);
});

Deno.test("auth: an empty key never reaches the network", async () => {
  const { m, res } = test([], "  ");
  assertEquals((await res).ok, false);
  assertEquals(m.calls.length, 0);
});
