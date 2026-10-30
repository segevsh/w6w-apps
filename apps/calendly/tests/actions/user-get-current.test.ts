import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-current.ts";

test("user-get-current: GETs /users/me and returns the response verbatim", async () => {
  const body = { resource: { uri: "https://api.calendly.com/users/AAAA", name: "Ada" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.calendly.com");
  assertEquals(url.pathname, "/users/me");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
