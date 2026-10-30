import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userInfo from "../../actions/user-info.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("user-info: GETs /user-info and returns the body", async () => {
  const body = { userId: "1001921515", userName: "BenderIsGreat", signupTimeSec: 1163850013 };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await userInfo.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/reader/api/0/user-info");
  assertEquals(out, body);
});
