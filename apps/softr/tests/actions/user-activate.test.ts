import { assertEquals } from "@std/assert";
import userActivate from "../../actions/user-activate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-activate: POSTs /users/{email}/activate", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await userActivate.execute({ domain: "yourdomain.com", email: "user@softr.io" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/users/user%40softr.io/activate");
  assertEquals(calls[0].method, "POST");
});

Deno.test("user-activate: is marked idempotent", () => {
  assertEquals(userActivate.idempotent, true);
});
