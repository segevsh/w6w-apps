import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("user-get: fetches /v2/me and returns the body unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Ada", email: "ada@example.com" } }]);
  const out = await userGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/me");
  assertEquals(out, { id: 1, name: "Ada", email: "ada@example.com" });
});

test("user-get: takes no parameters", () => {
  assertEquals(userGet.params?.length, 0);
});
