import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/image-get-many.ts";

test("image-get-many: GETs /images and returns the collection verbatim", async () => {
  const body = [{ id: "img1", src: "https://images.typeform.com/img1" }];
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/images");
  assertEquals(result, body);
});
