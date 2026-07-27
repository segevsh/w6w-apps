import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-collection.ts";

Deno.test("get-collection: GETs /v2/collections/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", fields: [] } }]);
  await action.execute!({ collectionId: "c1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/collections/c1");
  assertEquals(calls[0].method, "GET");
});
