import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";
import { USER_AGENT } from "../../lib/client.ts";

Deno.test("oauth2: declares Reddit's endpoints, permanent duration, and no PKCE", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://www.reddit.com/api/v1/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://www.reddit.com/api/v1/access_token");
  assertEquals(auth.oauth2?.refreshUrl, "https://www.reddit.com/api/v1/access_token");
  assertEquals(auth.oauth2?.pkce, false);
  assertEquals(auth.oauth2?.extraAuthParams, { duration: "permanent" });
  assertEquals(auth.oauth2?.scopes, ["identity", "read", "submit", "vote"]);
});

Deno.test("oauth2: sign sets both the Bearer header and the mandatory User-Agent", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://oauth.reddit.com/api/v1/me",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
  assertEquals(out.headers["user-agent"], USER_AGENT);
});

Deno.test("oauth2: test reports the upstream status", async () => {
  const bad = mockCtx([{ status: 403, body: {} }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, bad.ctx), {
    ok: false,
    message: "Reddit returned 403",
  });
});

Deno.test("oauth2: test refuses an empty credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test sends the User-Agent itself, since sign never runs for it", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await auth.test({ credential: { accessToken: "t" } }, ctx);
  assertEquals(calls[0].headers["user-agent"], USER_AGENT);
});

Deno.test("oauth2: afterConnect labels the connection with the username", async () => {
  const { ctx } = mockCtx([{ body: { id: "7", name: "acme" } }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {
    user: { id: "7", name: "acme" },
  });
});
