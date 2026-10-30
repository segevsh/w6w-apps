import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import fieldsList from "../../actions/fields-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("fields-list: GETs /v1/company/people/fields and counts the array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "root.id" }, { id: "work.title" }] }]);
  const out = await fieldsList.execute({}, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/v1/company/people/fields");
  assertEquals(out.count, 2);
});
