import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/personal-access-token.ts";

test("pat: is a bearer method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "personal-access-token");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

test("pat: sign appends Bearer using credential.apiKey", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "cal-abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer cal-abc");
});

test("pat: test hits /users/me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { resource: { name: "A" } } }]);
  const result = await auth.test({ credential: { apiKey: "cal-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.calendly.com");
  assertEquals(url.pathname, "/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer cal-abc");
});

test("pat: test reports failure when credential missing", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("missing"));
});

test("pat: test reports failure with status code when API rejects", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthorized" } }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});
