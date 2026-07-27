import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/personal-access-token.ts";

Deno.test("personal-access-token: is a bearer method exposing an `accessToken` secret field", () => {
  assertEquals(auth.key, "personal-access-token");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "accessToken");
  assert(field, "must declare an `accessToken` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("personal-access-token: sign appends Bearer using credential.accessToken", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.typeform.com/forms",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tfp-abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tfp-abc");
});

Deno.test("personal-access-token: test hits /me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { alias: "me" } }]);
  const result = await auth.test({ credential: { accessToken: "tfp-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.typeform.com");
  assertEquals(url.pathname, "/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tfp-abc");
});

Deno.test("personal-access-token: test reports failure with status code when API rejects", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { code: "UNAUTHORIZED" } }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});

Deno.test("personal-access-token: test rejects a missing token without a request", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});
