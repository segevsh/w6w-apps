import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-templates.ts";

test("get-templates: GETs /templates/ and passes filter through", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ filter: 'equals(name,"Welcome")' }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/templates/");
  assertEquals(url.searchParams.get("filter"), 'equals(name,"Welcome")');
});
