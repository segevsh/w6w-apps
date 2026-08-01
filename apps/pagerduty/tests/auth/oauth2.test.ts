import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares PagerDuty's endpoints and the classic write scope", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://app.pagerduty.com/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://app.pagerduty.com/oauth/token");
  assertEquals(auth.oauth2?.scopes, ["write"]);
});

Deno.test("oauth2: sign sets the Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.pagerduty.com/incidents",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "pd-oauth-token" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer pd-oauth-token");
});

Deno.test("oauth2: test probes GET /abilities and reports the upstream status", async () => {
  const bad = mockCtx([{ status: 403, body: {} }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, bad.ctx), {
    ok: false,
    message: "PagerDuty returned 403",
  });
  assertEquals(bad.calls[0].url, "https://api.pagerduty.com/abilities");
  assertEquals(bad.calls[0].headers["authorization"], "Bearer t");
});

Deno.test("oauth2: afterConnect fetches /users/me for the connection label", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { user: { id: "U1", name: "Ada", email: "ada@example.com" } } },
  ]);
  const label = await auth.afterConnect!({ credential: { accessToken: "t" } }, ctx);
  assertEquals(calls[0].url, "https://api.pagerduty.com/users/me");
  assertEquals(label, { user: { id: "U1", name: "Ada", email: "ada@example.com" } });
});
