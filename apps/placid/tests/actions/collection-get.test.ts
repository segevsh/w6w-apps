import { assertEquals } from "@std/assert";
import collectionGet from "../../actions/collection-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("collection-get: GET by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", template_uuids: ["a"] } }]);
  await collectionGet.execute({ collection_id: "c1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/collections/c1");
  await assertRejects(() => collectionGet.execute({ collection_id: " " }, mockCtx().ctx));
});
