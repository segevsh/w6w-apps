import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Figma's authorize/token URLs and a space scope separator", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://www.figma.com/oauth");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.figma.com/v1/oauth/token");
  assertEquals(auth.oauth2?.refreshUrl, "https://api.figma.com/v1/oauth/refresh");
  assertEquals(auth.oauth2?.scopeSeparator, " ");
  assert(auth.oauth2?.scopes?.includes("file_content:read"));
  assert(auth.oauth2?.scopes?.includes("current_user:read"));
});

Deno.test("oauth2: sign appends Bearer using credential.accessToken", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at-abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at-abc");
});

Deno.test("oauth2: test hits /v1/me with a Bearer header and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "u1" } }]);
  const result = await auth.test({ credential: { accessToken: "at-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/v1/me");
  assertEquals(calls[0].headers["authorization"], "Bearer at-abc");
});

Deno.test("oauth2: test reports failure when API rejects the token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { status: 401, err: "Invalid token" } }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});
