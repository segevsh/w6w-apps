import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import instantUrlDelete from "../../actions/instant-url-delete.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

test("instant-url-delete: DELETE /instant_urls/{uid}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await instantUrlDelete.execute({ uid: "iu1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/instant_urls/iu1");
  assertEquals(out, { uid: "iu1", deleted: true });
});

test("instant-url-delete: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => instantUrlDelete.execute({ uid: "" }, ctx));
});
