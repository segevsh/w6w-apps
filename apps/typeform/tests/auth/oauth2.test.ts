import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Typeform's authorize and token endpoints", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://api.typeform.com/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.typeform.com/oauth/token");
  assertEquals(auth.oauth2?.pkce, false);
  assert(auth.oauth2?.scopes?.includes("forms:read"));
  assert(auth.oauth2?.scopes?.includes("responses:read"));
});

Deno.test("oauth2: sign uses the Bearer scheme", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.typeform.com/forms",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test hits /me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { alias: "me" } }]);
  const result = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/me");
});

Deno.test("oauth2: afterConnect returns the account profile", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { email: "a@b.co", alias: "me" } }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(out, { account: { email: "a@b.co", alias: "me" } });
});
