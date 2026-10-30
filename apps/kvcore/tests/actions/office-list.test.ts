import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import officeList from "../../actions/office-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("office-list: sends page/limit and fetches /offices", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1, name: "HQ" }]) }]);
  await officeList.execute({ page: 2, limit: 25 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/public/offices");
  assertEquals(queryOf(calls[0].url), { page: ["2"], limit: ["25"] });
});

test("office-list: with no input sends no query", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await officeList.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
