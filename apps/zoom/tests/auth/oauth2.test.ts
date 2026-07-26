import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Zoom's endpoints with PKCE on", () => {
  assertEquals(auth.oauth2?.authorizationUrl, "https://zoom.us/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://zoom.us/oauth/token");
  assertEquals(auth.oauth2?.refreshUrl, "https://zoom.us/oauth/token");
  assertEquals(auth.oauth2?.pkce, true);
});

Deno.test("oauth2: sign sets the Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.zoom.us/v2/users/me",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test reports the upstream status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, ctx), {
    ok: false,
    message: "Zoom returned 401",
  });
});
