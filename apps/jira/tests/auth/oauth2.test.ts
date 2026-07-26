import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: asks for offline_access so scheduled runs keep working", () => {
  assertEquals(auth.oauth2?.authorizationUrl, "https://auth.atlassian.com/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://auth.atlassian.com/oauth/token");
  // Without offline_access Atlassian issues no refresh token and the
  // connection dies after an hour.
  assert(auth.oauth2?.scopes?.includes("offline_access"));
  assertEquals(auth.oauth2?.extraAuthParams?.audience, "api.atlassian.com");
});

Deno.test("oauth2: test rejects a token that reaches no Jira site", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, ctx), {
    ok: false,
    message: "the token grants access to no Jira site",
  });
});

Deno.test("oauth2: test accepts a token with at least one accessible site", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "c1", name: "Acme" }] }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.atlassian.com/oauth/token/accessible-resources");
});

Deno.test("oauth2: afterConnect resolves the cloud id the client needs", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: "cloud-1", name: "Acme", url: "https://acme.atlassian.net" }] },
    { body: { accountId: "a1", displayName: "Jo" } },
  ]);
  const out = await auth.afterConnect!({ credential: {} }, ctx);
  assertEquals(out.cloudId, "cloud-1");
  assertEquals(out.siteName, "Acme");
  assertEquals(calls[1].url, "https://api.atlassian.com/ex/jira/cloud-1/rest/api/3/myself");
});

Deno.test("oauth2: afterConnect degrades to {} when no site is accessible", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {});
});
