import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import groupList from "../../actions/group-list.ts";
import { mockCtx, odataList, pathOf } from "../_helpers.ts";

test("group-list: calls GET /v1/Groups", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([{ id: "g1" }]) }]);
  const out = await groupList.execute({}, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/Groups");
  assertEquals(out.items, [{ id: "g1" }]);
});
