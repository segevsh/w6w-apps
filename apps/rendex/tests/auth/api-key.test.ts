import { assertEquals } from "@std/assert";
import apiKey, { PROBE_PATH } from "../../auth/api-key.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

const CRED = { apiKey: "rdx_unit-test-fixture" };

Deno.test("api-key: sign stamps a Bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://api.rendex.dev/v1/watches",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: CRED }, {} as never) as typeof request;
  assertEquals(signed.headers.authorization, "Bearer rdx_unit-test-fixture");
  assertEquals(signed.url, "https://api.rendex.dev/v1/watches");
});

Deno.test("api-key: the probe is the free GET /v1/account", () => {
  assertEquals(PROBE_PATH, "/v1/account");
});

Deno.test("api-key: test passes on the documented account body and sends the key as Bearer", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ plan: "free", usage: {} }) }]);
  assertEquals(await apiKey.test({ credential: CRED }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/account");
  assertEquals(calls[0].headers.authorization, "Bearer rdx_unit-test-fixture");
});

Deno.test("api-key: key-family codes fail, whatever the spelling or status", async () => {
  for (
    const [status, code] of [
      [401, "INVALID_KEY"],
      [401, "INVALID_API_KEY"],
      [401, "MISSING_API_KEY"],
      [403, "KEY_DISABLED"],
    ] as const
  ) {
    const { ctx } = mockCtx([{ status, body: errorBody(code, "nope") }]);
    const r = await apiKey.test({ credential: CRED }, ctx);
    assertEquals(r.ok, false, code);
    assertEquals(r.message?.includes(code), true, r.message);
    assertEquals(r.message?.includes(CRED.apiKey), false, "message must not echo the key");
  }
});

Deno.test("api-key: a recognised key with a rate/usage/plan error is live", async () => {
  for (
    const [status, code] of [[429, "RATE_LIMITED"], [429, "USAGE_EXCEEDED"], [
      403,
      "FORBIDDEN",
    ]] as const
  ) {
    const { ctx } = mockCtx([{ status, body: errorBody(code, "x") }]);
    assertEquals(await apiKey.test({ credential: CRED }, ctx), { ok: true }, code);
  }
});

Deno.test("api-key: a non-Rendex body or a missing key fails", async () => {
  const html = mockCtx([{
    status: 200,
    body: "<html></html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await apiKey.test({ credential: CRED }, html.ctx)).ok, false);
  const none = mockCtx();
  assertEquals((await apiKey.test({ credential: {} }, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
});
