import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Facebook Login endpoints and Instagram scopes", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://www.facebook.com/v23.0/dialog/oauth");
  assertEquals(auth.oauth2?.tokenUrl, "https://graph.facebook.com/v23.0/oauth/access_token");
  assertEquals(auth.oauth2?.scopes, [
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_comments",
    "instagram_manage_insights",
    "pages_show_list",
    "pages_read_engagement",
  ]);
});

Deno.test("oauth2: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: test without accessToken makes no call", async () => {
  const { ctx, calls } = mockCtx();
  const r = await auth.test({ credential: {} }, ctx);
  assertEquals(r.ok, false);
  assert((r.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test probes /me?fields=id and never echoes the token", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  const r = await auth.test({ credential: { accessToken: "SECRET-TOK" } }, ctx);
  assertEquals(r.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/me");
  assertEquals(url.searchParams.get("fields"), "id");
  assertEquals(calls[0].headers["authorization"], "Bearer SECRET-TOK");
  assert(!JSON.stringify(r).includes("SECRET-TOK"));
});

Deno.test("oauth2: a Graph error body fails the test even on 200", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { error: { message: "Invalid OAuth access token", code: 190 } },
  }]);
  const r = await auth.test({ credential: { accessToken: "t" } }, ctx);
  assertEquals(r.ok, false);
  assert((r.message ?? "").includes("190"));
});

Deno.test("oauth2: non-ok status and id-less body fail", async () => {
  let m = mockCtx([{ status: 500, body: "" }]);
  assertEquals((await auth.test({ credential: { accessToken: "t" } }, m.ctx)).ok, false);
  m = mockCtx([{ body: {} }]);
  assertEquals((await auth.test({ credential: { accessToken: "t" } }, m.ctx)).ok, false);
});

Deno.test("oauth2: afterConnect returns the user identity", async () => {
  const { ctx } = mockCtx([{ body: { id: "u1", name: "N" } }]);
  const r = await auth.afterConnect!({ credential: { accessToken: "t" } } as never, ctx);
  assertEquals(r, { user: { id: "u1", name: "N" } });
});
