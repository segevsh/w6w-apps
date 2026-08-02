import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares SurveyMonkey's authorize and token endpoints", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://api.surveymonkey.com/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.surveymonkey.com/oauth/token");
  assertEquals(auth.oauth2?.pkce, false);
  assertEquals(auth.oauth2?.scopeSeparator, ",");
  assert(auth.oauth2?.scopes?.includes("surveys_read"));
  assert(auth.oauth2?.scopes?.includes("responses_read_detail"));
  assert(auth.oauth2?.scopes?.includes("collectors_write"));
  assert(auth.oauth2?.scopes?.includes("contacts_write"));
});

Deno.test("oauth2: sign uses the Bearer scheme", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.surveymonkey.com/v3/surveys",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test hits /users/me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1234" } }]);
  const result = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/v3/users/me");
});

Deno.test("oauth2: test reports failure when the credential is missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test reports failure with status code when API rejects", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: { name: "Unauthorized" } } }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});

Deno.test("oauth2: afterConnect returns the account profile", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { email: "a@b.co", id: "1234" } }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(out, { account: { email: "a@b.co", id: "1234" } });
});
