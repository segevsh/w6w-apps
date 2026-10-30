import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import linkUpdate from "../../actions/link-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("link-update: PATCH /v1/links/{id} sends only provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "link_1", name: "New" } }]);
  const out = await linkUpdate.execute(
    { linkId: "link_1", name: "New", privateName: "pn" },
    ctx,
  ) as {
    name: string;
  };
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v1/links/link_1");
  assertEquals(JSON.parse(calls[0].body!), { name: "New", private_name: "pn" });
  assertEquals(out.name, "New");
});
