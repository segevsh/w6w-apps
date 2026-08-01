import { assertEquals } from "@std/assert";
import { mockOktaCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /users/{id}", async () => {
  const { ctx, calls } = mockOktaCtx([{ body: { id: "00u1" } }]);
  await action.execute({ userId: "00u1" }, ctx);
  assertEquals(calls[0].url, "https://dev-1.okta.com/api/v1/users/00u1");
});

Deno.test("user-get: URL-encodes a login used as the id", async () => {
  const { ctx, calls } = mockOktaCtx([{ body: { id: "00u1" } }]);
  await action.execute({ userId: "jane@acme.test" }, ctx);
  assertEquals(calls[0].url, "https://dev-1.okta.com/api/v1/users/jane%40acme.test");
});
