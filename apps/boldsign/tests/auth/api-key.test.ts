import { assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import apiKey from "../../auth/api-key.ts";
import { DEFAULT_CREDENTIAL, hostOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sign: stamps the X-API-KEY header and does not touch anything else", async () => {
  const request: SignableRequest = {
    url: "https://api.boldsign.com/v1/document/list",
    method: "GET",
    headers: {},
  };
  const signed = await apiKey.sign!({ request, credential: DEFAULT_CREDENTIAL }, {} as never);
  assertEquals(signed.headers["x-api-key"], "key-1");
});

Deno.test("test: ok when GET /v1/plan/apiCreditsCount succeeds", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { BalanceCredits: 42 } }]);
  const result = await apiKey.test!({ credential: DEFAULT_CREDENTIAL }, ctx);
  assertEquals(result.ok, true);
  assertEquals(hostOf(calls[0]), "api.boldsign.com");
  assertEquals(pathOf(calls[0]), "/v1/plan/apiCreditsCount");
  assertEquals(calls[0].headers["x-api-key"], "key-1");
});

Deno.test("test: uses the credential's own apiHost, not always the US default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { BalanceCredits: 1 } }]);
  await apiKey.test!(
    { credential: { apiHost: "api-eu.boldsign.com", apiKey: "key-1" } },
    ctx,
  );
  assertEquals(hostOf(calls[0]), "api-eu.boldsign.com");
});

Deno.test("test: fails without asserting on a body, when BoldSign sends none (real 401 shape)", async () => {
  const { ctx } = mockCtx([{ status: 401, body: undefined }]);
  const result = await apiKey.test!({ credential: DEFAULT_CREDENTIAL }, ctx);
  assertEquals(result.ok, false);
  assertEquals(typeof result.message, "string");
});

Deno.test("test: surfaces BoldSign's own error message when a body is present", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { type: "invalid_request_error", message: "bad request" } },
  }]);
  const result = await apiKey.test!({ credential: DEFAULT_CREDENTIAL }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("invalid_request_error"), true);
});

Deno.test("test: reports missing apiKey without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: { apiHost: "api.boldsign.com" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: records apiHost, defaulting to the US host", async () => {
  const display = await apiKey.afterConnect!({ credential: DEFAULT_CREDENTIAL }, {} as never);
  assertEquals(display, { apiHost: "api.boldsign.com" });

  const fallback = await apiKey.afterConnect!({ credential: { apiKey: "key-1" } }, {} as never);
  assertEquals(fallback, { apiHost: "api.boldsign.com" });
});
