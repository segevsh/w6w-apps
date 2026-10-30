import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userGet from "../../actions/user-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("user-get: GETs /v2/users/me", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ id: 1, username: "me", email: "me@example.com", credits: 500 }),
  }]);
  const out = await userGet.execute({}, ctx) as { credits: number };
  assertEquals(pathOf(calls[0].url), "/v2/users/me");
  assertEquals(out.credits, 500);
});

test("user-get: declares no params — it takes no input", () => {
  assertEquals(userGet.params, []);
});
