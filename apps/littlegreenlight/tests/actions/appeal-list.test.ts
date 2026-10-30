import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import appealList from "../../actions/appeal-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("appeal-list: hits /api/v1/appeals.json", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1, name: "Year-end appeal" }]) }]);
  const out = await appealList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/appeals.json");
  assertEquals((out as { items: unknown[] }).items.length, 1);
});

test("appeal-list: pagination is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await appealList.execute({ limit: 5, offset: 10 }, ctx);
  assertEquals(queryOf(calls[0].url), { limit: "5", offset: "10" });
});
