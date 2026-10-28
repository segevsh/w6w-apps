import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Google's authorization, token, refresh and revoke endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2!.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(auth.oauth2!.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2!.refreshUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2!.revokeUrl, "https://oauth2.googleapis.com/revoke");
  assertEquals(auth.oauth2!.pkce, true);
});

Deno.test("oauth2: requests exactly one scope — force-ssl, the only one covering comments", () => {
  // Per the discovery document, commentThreads.list and comments.insert accept
  // youtube.force-ssl and nothing else, while every other method this app calls
  // accepts it too. So one scope is both sufficient and minimal.
  assertEquals(auth.oauth2!.scopes, ["https://www.googleapis.com/auth/youtube.force-ssl"]);
});

Deno.test("oauth2: asks for offline access so a refresh token comes back", () => {
  assertEquals(auth.oauth2!.extraAuthParams, { access_type: "offline", prompt: "consent" });
});

Deno.test("oauth2: collects no fields — an OAuth method prompts for nothing", () => {
  assertEquals(auth.fields, undefined);
});

Deno.test("oauth2: sign stamps a bearer header and touches nothing else", async () => {
  const { ctx } = mockCtx([]);
  const request = {
    url: "https://youtube.googleapis.com/youtube/v3/videos?part=id",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(signed.headers["authorization"], "Bearer tok");
  // The URL must be untouched — this method is a header method.
  assertEquals(signed.url, "https://youtube.googleapis.com/youtube/v3/videos?part=id");
});

Deno.test("oauth2: test probes channels.list?mine=true — 1 unit, reachable by every scope", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "UC1" }] } }]);
  const out = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(out, { ok: true });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/youtube/v3/channels");
  assertEquals(url.searchParams.get("part"), "id");
  assertEquals(url.searchParams.get("mine"), "true");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test treats an account with no channel as live, not broken", async () => {
  const { ctx } = mockCtx([{ body: { items: [] } }]);
  assertEquals(await auth.test({ credential: { accessToken: "tok" } }, ctx), { ok: true });
});

Deno.test("oauth2: test reports a missing token without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test surfaces the upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  const out = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("401"));
});

Deno.test("oauth2: afterConnect labels the connection with the channel title", async () => {
  const { ctx, calls } = mockCtx([
    { body: { items: [{ id: "UC1", snippet: { title: "My Channel", customUrl: "@mine" } }] } },
  ]);
  const out = await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(out, { channel: { id: "UC1", title: "My Channel", handle: "@mine" } });
  assertEquals(new URL(calls[0].url).searchParams.get("part"), "snippet");
  assertEquals(auth.connectionLabel, "{{channel.title}}");
});

Deno.test("oauth2: afterConnect degrades quietly when there is no channel", async () => {
  const { ctx } = mockCtx([{ body: { items: [] } }]);
  assertEquals(
    await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx),
    { channel: { title: "YouTube" } },
  );
});

Deno.test("oauth2: afterConnect returns empty rather than throwing on an API failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx), {});
});
