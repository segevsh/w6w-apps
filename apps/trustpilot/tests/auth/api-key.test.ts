import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import type { SignableRequest } from "@w6w/types";
import auth from "../../auth/api-key.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

test("api-key: sign() stamps the apikey header, never Authorization", () => {
  const request: SignableRequest = {
    url: "https://api.trustpilot.com/v1/x",
    method: "GET",
    headers: {},
  };
  const signed = auth.sign!({ request, credential: { apiKey: "secret-key" } }, mockCtx().ctx);
  assertEquals((signed as SignableRequest).headers["apikey"], "secret-key");
  assertEquals((signed as SignableRequest).headers["authorization"], undefined);
});

test("api-key: test() probes business-units/search with a hard-coded query, not the caller's own", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { businessUnits: [] } }]);
  const out = await auth.test({ credential: { apiKey: "secret-key" } }, ctx);
  assertEquals(out.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/v1/business-units/search");
  assertEquals(calls[0].headers["apikey"], "secret-key");
  const q = queryOf(calls[0].url);
  assertEquals(q.query, "trustpilot");
});

test("api-key: test() fails without leaking a credential-echoing endpoint", async () => {
  const { ctx } = mockCtx([]);
  const out = await auth.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message, "credential is missing apiKey");
});

test("api-key: test() reports a 401 with a specific, actionable message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const out = await auth.test({ credential: { apiKey: "bad-key" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("401"), true);
});

test("api-key: credential field is declared secret", () => {
  for (const f of auth.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});

test("api-key: declares the header shape as apikey, no prefix", () => {
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "apikey");
  assertEquals(auth.apiKey?.prefix, undefined);
});
