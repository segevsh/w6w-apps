import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import meGet from "../../actions/me-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("me-get: calls GET /me and returns the body verbatim", async () => {
  const profile = {
    account_id: 1,
    room_id: 322,
    name: "John Smith",
    chatwork_id: "tarochatworkid",
  };
  const { ctx, calls } = mockCtx([{ body: profile }]);
  const out = await meGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/me");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, profile);
});

test("me-get: takes no parameters", () => {
  assertEquals(meGet.params?.length, 0);
});
