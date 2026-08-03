import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /user and returns the unwrapped content", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ username: "johnsmith", status: "ACTIVE" }, { "limit-left": 4999 }) },
  ]);
  const result = await action.execute({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/user");
  assertEquals(url.search, "");
  assertEquals(result, { username: "johnsmith", status: "ACTIVE" });
});
