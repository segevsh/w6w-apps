import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userGet from "../../actions/user-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("user-get: fetches the profile and returns it unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ username: "acme", email: "a@b.com" }) }]);
  const out = await userGet.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/users/me");
  assertEquals(out, { username: "acme", email: "a@b.com" });
});

test("user-get: takes no parameters", () => {
  assertEquals(userGet.params?.length, 0);
});
