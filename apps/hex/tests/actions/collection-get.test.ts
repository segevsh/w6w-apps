import { assertEquals } from "@std/assert";
import action from "../../actions/collection-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("collection-get: GET /collections/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "N" } }]);
  const out = await action.execute({ collectionId: "x1" }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/api/v1/collections/x1");
  assertEquals(out.name, "N");
});

Deno.test("collection-get: the id cannot escape its path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ collectionId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/collections/a%2Fb");
});
