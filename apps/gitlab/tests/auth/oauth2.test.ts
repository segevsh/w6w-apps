import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

test("oauth2: declares GitLab.com's endpoints, the api scope, and turns PKCE off", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://gitlab.com/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://gitlab.com/oauth/token");
  assertEquals(auth.oauth2?.scopes, ["api"]);
  assertEquals(auth.oauth2?.pkce, false);
});

test("oauth2: sign sets the Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://gitlab.com/api/v4/user",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "glt-x" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer glt-x");
});

test("oauth2: test reports the upstream status", async () => {
  const bad = mockCtx([{ status: 403, body: {} }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, bad.ctx), {
    ok: false,
    message: "GitLab returned 403",
  });
});
