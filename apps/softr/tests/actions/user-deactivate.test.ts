import { assertEquals } from "@std/assert";
import userDeactivate from "../../actions/user-deactivate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-deactivate: POSTs /users/{email}/deactivate", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await userDeactivate.execute({ domain: "yourdomain.com", email: "user@softr.io" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/users/user%40softr.io/deactivate");
  assertEquals(calls[0].method, "POST");
});

Deno.test("user-deactivate: is marked idempotent", () => {
  assertEquals(userDeactivate.idempotent, true);
});
