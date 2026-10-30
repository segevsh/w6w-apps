import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import animationTemplateDelete from "../../actions/animation-template-delete.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

test("animation-template-delete: DELETE /animation_templates/{uid}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await animationTemplateDelete.execute({ uid: "at1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/animation_templates/at1");
  assertEquals(out, { uid: "at1", deleted: true });
});

test("animation-template-delete: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => animationTemplateDelete.execute({ uid: "" }, ctx));
});
