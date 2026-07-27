import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: declares the api_token query-param wiring", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "query", name: "api_token" });
});

Deno.test("api-token: sign appends api_token to the query string, not a header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.pipedrive.com/v1/deals",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiToken: "tok123" } }, ctx);
  const url = new URL(out.url);
  assertEquals(url.searchParams.get("api_token"), "tok123");
  assertEquals(out.headers["authorization"], undefined);
});

Deno.test("api-token: test hits /users/me with the token and passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 1 } } }]);
  const result = await auth.test({ credential: { apiToken: "tok123" } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/users/me");
  assertEquals(url.searchParams.get("api_token"), "tok123");
  assertEquals(result.ok, true);
});

Deno.test("api-token: test fails cleanly on a non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { success: false } }]);
  const result = await auth.test({ credential: { apiToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("api-token: afterConnect derives user + company labels", async () => {
  const { ctx } = mockCtx([
    { body: { success: true, data: { name: "Ada", email: "ada@x.io", company_name: "Acme" } } },
  ]);
  const meta = await auth.afterConnect!({ credential: { apiToken: "tok" } }, ctx);
  assertEquals((meta.user as { name: string }).name, "Ada");
  assertEquals((meta.company as { name: string }).name, "Acme");
});
