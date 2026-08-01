import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Spotify's endpoints, scopes and PKCE", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://accounts.spotify.com/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://accounts.spotify.com/api/token");
  assertEquals(auth.oauth2?.refreshUrl, "https://accounts.spotify.com/api/token");
  assertEquals(auth.oauth2?.pkce, true);
  assertEquals(auth.oauth2?.scopes, [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-modify-public",
    "playlist-modify-private",
    "user-read-currently-playing",
  ]);
});

Deno.test("oauth2: sign sets the Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.spotify.com/v1/me",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at_x" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at_x");
});

Deno.test("oauth2: test reports missing credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  const out = await auth.test({ credential: {} }, ctx);
  assertEquals(out, { ok: false, message: "credential missing accessToken" });
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test reports the upstream status", async () => {
  const bad = mockCtx([{ status: 401, body: {} }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, bad.ctx), {
    ok: false,
    message: "Spotify returned 401",
  });
});

Deno.test("oauth2: test reports ok on a live credential", async () => {
  const ok = mockCtx([{ status: 200, body: { id: "u1" } }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, ok.ctx), { ok: true });
});

Deno.test("oauth2: afterConnect extracts id, display_name and email", async () => {
  const { ctx } = mockCtx([
    { body: { id: "u1", display_name: "Alice", email: "alice@example.com" } },
  ]);
  const out = await auth.afterConnect!({ credential: { accessToken: "t" } }, ctx);
  assertEquals(out, { user: { id: "u1", display_name: "Alice", email: "alice@example.com" } });
});

Deno.test("oauth2: afterConnect returns empty on a failed lookup", async () => {
  const { ctx } = mockCtx([{ status: 403, body: {} }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "t" } }, ctx);
  assertEquals(out, {});
});
