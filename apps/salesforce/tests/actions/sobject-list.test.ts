import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockSalesforceCtx } from "../_helpers.ts";
import action from "../../actions/sobject-list.ts";

test("sobject-list: GETs /sobjects and takes no params", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: { sobjects: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/services/data/v60.0/sobjects");
  assertEquals(action.params, []);
});
