import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/category-create.ts";

Deno.test("category-create: POSTs /categories.json with just a name", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { category: { id: 3 } } }]);
  await action.execute({ name: "Support" }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/categories.json`);
  assertEquals(JSON.parse(calls[0].body!), { name: "Support" });
});

Deno.test("category-create: colours map to color / text_color", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ name: "n", color: "49d9e9", textColor: "f0fcfd" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.color, "49d9e9");
  assertEquals(body.text_color, "f0fcfd");
});

Deno.test("category-create: the colour fields reject a leading #", () => {
  // Discourse takes bare six-digit hex; a `#` prefix is a silent 422, so the
  // form rejects it rather than the server.
  for (const key of ["color", "textColor"]) {
    const param = action.params!.find((p) => p.key === key)!;
    const re = new RegExp(param.validation!.pattern!);
    assertEquals(re.test("49d9e9"), true);
    assertEquals(re.test("#49d9e9"), false);
    assertEquals(re.test("49d9e"), false);
  }
});

Deno.test("category-create: permissions and the parent id pass through under API names", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute(
    { name: "n", parentCategoryId: 4, permissions: { everyone: 1, staff: 2 } },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.parent_category_id, 4);
  assertEquals(body.permissions, { everyone: 1, staff: 2 });
});
