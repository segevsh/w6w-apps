import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: is an oauth2 method with Acuity's documented endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://acuityscheduling.com/oauth2/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://acuityscheduling.com/oauth2/token");
  assertEquals(auth.oauth2?.scopes, ["api-v1"]);
});

Deno.test("oauth2: sign sets Bearer using credential.accessToken", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok-abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok-abc");
});

Deno.test("oauth2: test hits /me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "Acme", email: "a@acme.com" } }]);
  const result = await auth.test({ credential: { accessToken: "tok-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok-abc");
});

Deno.test("oauth2: test reports failure when credential missing", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("missing"));
});

Deno.test("oauth2: test reports failure with status code when API rejects", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthorized" } }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});
