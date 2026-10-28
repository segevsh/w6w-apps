import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the Google authorize/token endpoints and the Tasks scope", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(auth.oauth2?.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2?.refreshUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2?.revokeUrl, "https://oauth2.googleapis.com/revoke");
  // Google documents exactly two Tasks scopes; `tasks` is a superset of
  // `tasks.readonly`, and this app writes — so it asks for `tasks` alone.
  assertEquals(auth.oauth2?.scopes, ["https://www.googleapis.com/auth/tasks"]);
  // Google's OAuth server requires these for a refresh_token to come back.
  assertEquals(auth.oauth2?.extraAuthParams?.access_type, "offline");
  assertEquals(auth.oauth2?.extraAuthParams?.prompt, "consent");
  assertEquals(auth.oauth2?.pkce, true);
});

Deno.test("oauth2: sign appends the Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: sign makes no network call", async () => {
  const { ctx, calls } = mockCtx();
  await auth.sign!({
    request: { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> },
    credential: { accessToken: "acc" },
  }, ctx);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test with a missing accessToken reports it without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test probes tasklists.list — reachable by tasks.readonly too", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { kind: "tasks#taskLists", items: [] } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "tasks.googleapis.com");
  assertEquals(url.pathname, "/tasks/v1/users/@me/lists");
  assertEquals(url.searchParams.get("maxResults"), "1");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: test treats an account with zero lists as healthy", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { kind: "tasks#taskLists" } }]);
  assertEquals((await auth.test({ credential: { accessToken: "acc" } }, ctx)).ok, true);
});

Deno.test("oauth2: test surfaces the upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});
