import { assertEquals } from "@std/assert";
import userMagicLinkGenerate from "../../actions/user-magic-link-generate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-magic-link-generate: POSTs /users/magic-link/generate/{email}", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await userMagicLinkGenerate.execute({ domain: "yourdomain.com", email: "user@softr.io" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/users/magic-link/generate/user%40softr.io");
  assertEquals(calls[0].method, "POST");
});

Deno.test("user-magic-link-generate: is explicitly not idempotent", () => {
  assertEquals(userMagicLinkGenerate.idempotent, false);
});
