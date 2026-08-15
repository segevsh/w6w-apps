import { assertEquals } from "@std/assert";
import usersGet from "../../actions/users-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("users-get: fetches GET /users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, email: "bob@example.com" } }]);
  const out = await usersGet.execute({ id: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/public/v1/users/1");
  assertEquals(out, { id: 1, email: "bob@example.com" });
});

Deno.test("users-get: External ID form sends provider as a bare query param, not query[provider]", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await usersGet.execute({ id: "ext-42", provider: "SSO" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/public/v1/users/ext-42");
  assertEquals(queryOf(calls[0].url), { provider: "SSO" });
});
