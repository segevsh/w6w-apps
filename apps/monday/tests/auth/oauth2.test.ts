import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

test("oauth2: declares monday's endpoints and a space scope separator", () => {
  assertEquals(auth.oauth2?.authorizationUrl, "https://auth.monday.com/oauth2/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://auth.monday.com/oauth2/token");
  assertEquals(auth.oauth2?.scopeSeparator, " ");
  assertEquals(auth.oauth2?.pkce, false);
});

test("oauth2: sign DOES use the Bearer scheme, unlike the personal token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.monday.com/v2",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

test("oauth2: test refuses an empty credential", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
  assertEquals(calls.length, 0);
});
