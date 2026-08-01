import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Box's authorize/token endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://account.box.com/api/oauth2/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.box.com/oauth2/token");
});

Deno.test("oauth2: does not opt into PKCE (undocumented for Box)", () => {
  assertEquals(auth.oauth2?.pkce, false);
});

Deno.test("oauth2: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: test with missing accessToken reports the failure", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test GETs /users/me with a Bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "u1" } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/2.0/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: afterConnect maps id/name/login to user.id/name/email", async () => {
  const { ctx } = mockCtx([{ body: { id: "u1", name: "Ada Lovelace", login: "ada@example.com" } }]);
  const result = await auth.afterConnect!({ credential: { accessToken: "acc" } }, ctx);
  assertEquals(result, { user: { id: "u1", name: "Ada Lovelace", email: "ada@example.com" } });
});
