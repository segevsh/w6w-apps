import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-list.ts";

test("form-list: GETs /sites/{id}/forms", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "form1", name: "contact" }] }]);
  const result = await action.execute!({ siteId: "site1" }, ctx);

  assertEquals(calls[0].url, "https://api.netlify.com/api/v1/sites/site1/forms");
  assertEquals(result, [{ id: "form1", name: "contact" }]);
});

test("form-list: requires siteId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "siteId");
});
