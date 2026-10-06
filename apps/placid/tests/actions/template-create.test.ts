import { assertEquals } from "@std/assert";
import templateCreate from "../../actions/template-create.ts";
import { assertRejects, mockCtx } from "../_helpers.ts";

Deno.test("template-create: sends the documented fields; duplicate needs no title", async () => {
  const { ctx, calls } = mockCtx([{ body: { uuid: "n" } }]);
  await templateCreate.execute({
    title: "T",
    width: 1920,
    height: 1080,
    tags: "a, b",
    custom_data: "ref",
    add_to_collections: ["c1"],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "T",
    width: 1920,
    height: 1080,
    tags: ["a", "b"],
    custom_data: "ref",
    add_to_collections: ["c1"],
  });
  const dup = mockCtx([{ body: { uuid: "d" } }]);
  await templateCreate.execute({ from_template: "src" }, dup.ctx);
  assertEquals(JSON.parse(dup.calls[0].body!), { from_template: "src" });
  await assertRejects(() => templateCreate.execute({}, mockCtx().ctx));
});
