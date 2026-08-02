import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/page-token.ts";

Deno.test("page-token: declares a required secret accessToken field", () => {
  assertEquals(auth.key, "page-token");
  assertEquals(auth.type, "bearer");
  assertEquals(auth.fields?.length, 1);
  assertEquals(auth.fields?.[0].key, "accessToken");
  assertEquals(auth.fields?.[0].type, "secret");
  assertEquals(auth.fields?.[0].required, true);
});

Deno.test("page-token: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "page-tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer page-tok");
});

Deno.test("page-token: test with missing accessToken reports the failure without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("page-token: test issues GET /me?fields=id,name with Bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "p1", name: "My Page" } }]);
  const result = await auth.test({ credential: { accessToken: "page-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/me");
  assertEquals(url.searchParams.get("fields"), "id,name");
  assertEquals(calls[0].headers["authorization"], "Bearer page-abc");
});

Deno.test("page-token: afterConnect labels the connection with the Page's id/name", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "p1", name: "My Page" } }]);
  const result = await auth.afterConnect!({ credential: { accessToken: "page-abc" } }, ctx);
  assertEquals(result, { page: { id: "p1", name: "My Page" } });
});
