import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFormsiteCtx } from "../_helpers.ts";
import formItemsList from "../../actions/form-items-list.ts";

const B = "https://fs3.formsite.com/api/v2/acme";

test("form-items-list: GETs /items with results_labels when given", async () => {
  const { ctx, calls } = mockFormsiteCtx([{ body: { items: [{ id: "100" }] } }]);
  const out = await formItemsList.execute({ formDir: "f1", resultsLabels: "rl1" }, ctx);
  assertEquals(calls[0].url, B + "/forms/f1/items?results_labels=rl1");
  assertEquals(out, { items: [{ id: "100" }] });
});

test("form-items-list: omits a blank results_labels", async () => {
  const { ctx, calls } = mockFormsiteCtx([{ body: {} }]);
  const out = await formItemsList.execute({ formDir: "f1", resultsLabels: "" }, ctx);
  assertEquals(calls[0].url, B + "/forms/f1/items");
  assertEquals(out, { items: [] });
});
