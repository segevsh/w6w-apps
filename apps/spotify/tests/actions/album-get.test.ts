import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/album-get.ts";

test("album-get: GETs /albums/{id}, accepting a URI", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "4aawyAB9vmqN3uQ7FjRGTy" } }]);
  await action.execute({ id: "spotify:album:4aawyAB9vmqN3uQ7FjRGTy" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/albums/4aawyAB9vmqN3uQ7FjRGTy");
});
