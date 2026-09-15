import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sign-in-token-revoke.ts";

Deno.test("sign-in-token-revoke: POSTs to /sign_in_tokens/{id}/revoke", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "sit_1", status: "revoked" } }]);
  await action.execute!({ signInTokenId: "sit_1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/sign_in_tokens/sit_1/revoke");
});
