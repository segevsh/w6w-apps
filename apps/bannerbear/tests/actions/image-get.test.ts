import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import imageGet from "../../actions/image-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

test("image-get: GET /images/{uid}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { uid: "i1", status: "completed", files: { jpg: "https://cdn/x.jpg" } } },
  ]);
  const out = await imageGet.execute({ uid: "i1" }, ctx) as unknown as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/images/i1");
  assertEquals(out.status, "completed");
});

test("image-get: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => imageGet.execute({ uid: "" }, ctx));
});
