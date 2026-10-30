import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

test("oauth2: declares GitHub's endpoints and turns PKCE off", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://github.com/login/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://github.com/login/oauth/access_token");
  // GitHub's OAuth server does not implement PKCE, so the type default (true)
  // has to be overridden rather than inherited.
  assertEquals(auth.oauth2?.pkce, false);
  assertEquals(auth.oauth2?.scopes, ["repo", "read:org", "workflow"]);
});

test("oauth2: sign sets the Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.github.com/user",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "gho_x" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer gho_x");
});

test("oauth2: test reports the upstream status", async () => {
  const bad = mockCtx([{ status: 403, body: {} }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, bad.ctx), {
    ok: false,
    message: "GitHub returned 403",
  });
});
