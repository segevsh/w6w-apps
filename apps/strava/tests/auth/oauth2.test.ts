import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Strava's endpoints, comma scopes, and a same-host refresh", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://www.strava.com/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://www.strava.com/oauth/token");
  // Strava refreshes through the same token endpoint — no separate refresh host.
  assertEquals(auth.oauth2?.refreshUrl, "https://www.strava.com/oauth/token");
  assertEquals(auth.oauth2?.scopeSeparator, ",");
  assertEquals(auth.oauth2?.pkce, false);
  assertEquals(auth.oauth2?.scopes, ["profile:read_all", "activity:read_all", "activity:write"]);
});

Deno.test("oauth2: sign sets the Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://www.strava.com/api/v3/athlete",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "s_x" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer s_x");
});

Deno.test("oauth2: test reports the upstream status", async () => {
  const bad = mockCtx([{ status: 401, body: {} }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, bad.ctx), {
    ok: false,
    message: "Strava returned 401",
  });
});

Deno.test("oauth2: test fails locally when the credential is missing its token", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
});

Deno.test("oauth2: afterConnect surfaces athlete display data", async () => {
  const { ctx } = mockCtx([{ body: { id: 7, firstname: "Marianne", lastname: "T." } }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "t" } }, ctx);
  assertEquals(out, { athlete: { id: 7, firstname: "Marianne", lastname: "T." } });
});
