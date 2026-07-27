import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import oauth2 from "../../auth/oauth2.ts";

Deno.test("oauth2: signs with a RAW Authorization header (no Bearer prefix)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.clickup.com/api/v2/user",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await oauth2.sign!({ request, credential: { accessToken: "tok_abc" } }, ctx);
  assertEquals(out.headers["authorization"], "tok_abc");
});

Deno.test("oauth2: declares the ClickUp authorize/token endpoints", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://app.clickup.com/api");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.clickup.com/api/v2/oauth/token");
});

Deno.test("oauth2: test hook probes GET /user and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { user: { id: 1 } } }]);
  const result = await oauth2.test({ credential: { accessToken: "tok_abc" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/user");
});

Deno.test("oauth2: test hook flags a missing access token", async () => {
  const { ctx } = mockCtx([]);
  const result = await oauth2.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
});
