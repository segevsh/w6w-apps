import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userGet from "../../actions/user-get.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

test("user-get: retrieves by userID (the caller's own id)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", userID: "1234" } }]);
  await userGet.execute({ userID: "1234" }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v1/users/retrieve");
  assertEquals(bodyOf(calls[0]), { userID: "1234" });
});
