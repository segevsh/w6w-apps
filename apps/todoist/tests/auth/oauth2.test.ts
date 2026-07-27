import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Todoist's authorize/token endpoints and comma-separated scopes", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://todoist.com/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://todoist.com/oauth/access_token");
  assertEquals(auth.oauth2?.scopeSeparator, ",");
  assertEquals(auth.oauth2?.scopes, ["data:read_write", "data:delete"]);
});

Deno.test("oauth2: sign appends Bearer using credential.accessToken", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at-xyz");
});

Deno.test("oauth2: test hits /projects with the access token and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  const result = await auth.test({ credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v2/projects");
  assertEquals(calls[0].headers["authorization"], "Bearer at-xyz");
});

Deno.test("oauth2: test fails fast when accessToken is missing", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("accessToken"));
});
