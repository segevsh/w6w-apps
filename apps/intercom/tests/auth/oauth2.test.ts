import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Intercom's authorize + token endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://app.intercom.com/oauth");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.intercom.io/auth/eagle/token");
});

Deno.test("oauth2: sign appends Bearer using credential.accessToken", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "oauth_tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer oauth_tok");
});

Deno.test("oauth2: test hits /me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { type: "admin" } }]);
  const result = await auth.test({ credential: { accessToken: "oauth_tok" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/me");
  assertEquals(calls[0].headers["authorization"], "Bearer oauth_tok");
});

Deno.test("oauth2: test fails when the credential has no accessToken", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("accessToken"));
});

Deno.test("oauth2: afterConnect summarises the admin and workspace from /me", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { name: "Ann", email: "ann@x.com", app: { name: "Acme" } } },
  ]);
  const patch = await auth.afterConnect!({ credential: { accessToken: "t" } }, ctx) as {
    admin: { name: string };
    workspace: { name: string };
  };
  assertEquals(patch.admin.name, "Ann");
  assertEquals(patch.workspace.name, "Acme");
});
