import { assertEquals } from "@std/assert";
import collectionCreate from "../../actions/collection-create.ts";
import { assertRejects, mockCtx } from "../_helpers.ts";

Deno.test("collection-create: title required, template uuids listed", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c" } }]);
  await collectionCreate.execute({ title: "Acme", custom_data: "u1", template_uuids: "a,b" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Acme",
    custom_data: "u1",
    template_uuids: ["a", "b"],
  });
  await assertRejects(() => collectionCreate.execute({ title: "" }, mockCtx().ctx));
});
