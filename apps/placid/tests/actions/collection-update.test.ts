import { assertEquals } from "@std/assert";
import collectionUpdate from "../../actions/collection-update.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("collection-update: replace, add and remove lists map to their own keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c" } }]);
  await collectionUpdate.execute({
    collection_id: "c",
    template_uuids: ["a"],
    add_template_uuids: "b",
    remove_template_uuids: ["z"],
  }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/collections/c");
  assertEquals(JSON.parse(calls[0].body!), {
    template_uuids: ["a"],
    add_template_uuids: ["b"],
    remove_template_uuids: ["z"],
  });
  await assertRejects(() => collectionUpdate.execute({ collection_id: "c" }, mockCtx().ctx));
});
