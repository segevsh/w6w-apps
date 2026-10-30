import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import formList from "../../actions/form-list.ts";
import { mockCtx, page, queryOf } from "../_helpers.ts";

test("form-list: GETs /forms and returns the page", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, title: "Subscribe" }]) }]);
  const out = await formList.execute({}, ctx) as { data: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.sendfox.com/forms");
  assertEquals(out.data.length, 1);
});

test("form-list: a search string is passed as the query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await formList.execute({ query: "sub" }, ctx);
  assertEquals(queryOf(calls[0].url), { query: "sub" });
});
