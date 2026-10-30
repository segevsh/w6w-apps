import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import imageTemplateList from "../../actions/image-template-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("image-template-list: GET /image_templates with the page query param", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "t1", name: "Card" }] }]);
  const out = await imageTemplateList.execute({ page: 2 }, ctx) as unknown[];

  assertEquals(pathOf(calls[0].url), "/image_templates");
  assertEquals(queryOf(calls[0].url), { page: "2" });
  assertEquals(out, [{ uid: "t1", name: "Card" }]);
});

test("image-template-list: omits page when not given", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await imageTemplateList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
