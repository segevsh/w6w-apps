import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import tagGet from "../../actions/tag-get.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

test("tag-get: retrieves by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await tagGet.execute({ id: "t1" }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v1/tags/retrieve");
  assertEquals(bodyOf(calls[0]), { id: "t1" });
});
