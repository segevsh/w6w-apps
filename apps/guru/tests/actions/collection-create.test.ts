import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import collectionCreate from "../../actions/collection-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("collection-create: POSTs the name and strips the response token", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "co1", name: "Eng", token: "live" } }]);
  const result = await collectionCreate.execute(
    { name: "Eng", description: "Engineering docs" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v1/collections");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Eng", description: "Engineering docs" });
  assertEquals(result, { id: "co1", name: "Eng" });
});
