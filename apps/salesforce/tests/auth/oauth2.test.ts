import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: asks for refresh_token so the connection outlives the session", () => {
  assertEquals(
    auth.oauth2?.authorizationUrl,
    "https://login.salesforce.com/services/oauth2/authorize",
  );
  assertEquals(auth.oauth2?.tokenUrl, "https://login.salesforce.com/services/oauth2/token");
  // Salesforce issues no refresh token without this scope.
  assert(auth.oauth2?.scopes?.includes("refresh_token"));
  assertEquals(auth.oauth2?.pkce, true);
});

Deno.test("oauth2: test needs the instance URL as well as the token", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, ctx), {
    ok: false,
    message: "credential missing accessToken or instance URL",
  });
});

Deno.test("oauth2: test accepts either spelling of the instance URL field", async () => {
  // Salesforce names it `instance_url`; a camel-casing host produces `instanceUrl`.
  const snake = mockCtx([{ body: { user_id: "u" } }]);
  assertEquals(
    await auth.test(
      { credential: { accessToken: "t", instance_url: "https://acme.my.salesforce.com" } },
      snake.ctx,
    ),
    { ok: true },
  );

  const camel = mockCtx([{ body: { user_id: "u" } }]);
  assertEquals(
    await auth.test(
      { credential: { accessToken: "t", instanceUrl: "https://acme.my.salesforce.com" } },
      camel.ctx,
    ),
    { ok: true },
  );
});

Deno.test("oauth2: afterConnect lifts the instance URL onto the connection", async () => {
  const { ctx, calls } = mockCtx([
    { body: { user_id: "u1", name: "Jo", email: "jo@acme.test", organization_id: "org1" } },
  ]);
  const out = await auth.afterConnect!(
    { credential: { instance_url: "https://acme.my.salesforce.com" } },
    ctx,
  );
  assertEquals(out.instanceUrl, "https://acme.my.salesforce.com");
  assertEquals(out.user, { id: "u1", name: "Jo", email: "jo@acme.test" });
  assertEquals(calls[0].url, "https://acme.my.salesforce.com/services/oauth2/userinfo");
});

Deno.test("oauth2: afterConnect still records the instance if userinfo fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  assertEquals(
    await auth.afterConnect!(
      { credential: { instance_url: "https://acme.my.salesforce.com" } },
      ctx,
    ),
    { instanceUrl: "https://acme.my.salesforce.com" },
  );
});
