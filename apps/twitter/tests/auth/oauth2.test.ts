import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares X's endpoints and requires PKCE", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://x.com/i/oauth2/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.x.com/2/oauth2/token");
  assertEquals(auth.oauth2?.pkce, true);
  assertEquals(
    auth.oauth2?.scopes,
    ["tweet.read", "tweet.write", "users.read", "like.write", "media.write", "offline.access"],
  );
});

Deno.test("oauth2: sign sets the Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.x.com/2/users/me",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test reports the upstream status", async () => {
  const bad = mockCtx([{ status: 403, body: {} }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, bad.ctx), {
    ok: false,
    message: "X returned 403",
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

Deno.test("oauth2: afterConnect labels the connection with the handle", async () => {
  const { ctx } = mockCtx([{ body: { data: { id: "7", username: "acme", name: "Acme" } } }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {
    user: { id: "7", username: "acme", name: "Acme" },
  });
});
