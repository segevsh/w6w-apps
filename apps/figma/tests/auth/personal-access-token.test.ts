import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/personal-access-token.ts";

Deno.test("personal-access-token: is an apiKey method exposing a required `token` secret field", () => {
  assertEquals(auth.key, "personal-access-token");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "X-Figma-Token");
  const field = auth.fields?.find((f) => f.key === "token");
  assert(field, "must declare a `token` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("personal-access-token: sign sets x-figma-token from credential.token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { token: "figd-abc" } }, ctx);
  assertEquals(out.headers["x-figma-token"], "figd-abc");
});

Deno.test("personal-access-token: test hits /v1/me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "u1", handle: "segev" } }]);
  const result = await auth.test({ credential: { token: "figd-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.figma.com");
  assertEquals(url.pathname, "/v1/me");
  assertEquals(calls[0].headers["x-figma-token"], "figd-abc");
});

Deno.test("personal-access-token: test reports failure with status code when API rejects", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: 403, err: "Invalid token" } }]);
  const result = await auth.test({ credential: { token: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("403"));
});

Deno.test("personal-access-token: test reports failure with missing credential", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("personal-access-token: afterConnect fetches /v1/me for label data", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "u1", handle: "segev", email: "s@example.com" } },
  ]);
  const result = await auth.afterConnect!({ credential: { token: "figd-abc" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/me");
  assertEquals((result as { user: { handle: string } }).user.handle, "segev");
});
