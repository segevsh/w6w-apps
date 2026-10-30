import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import formGet from "../../actions/form-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("form-get: GETs /forms/{formId} and wraps the entity as {result}", async () => {
  const { ctx, calls } = mockCtx([{ body: { form_id: "f1", title: "My VideoAsk" } }]);
  const out = await formGet.execute({ formId: "f1" }, ctx) as { result: { form_id: string } };
  assertEquals(pathOf(calls[0].url), "/forms/f1");
  assertEquals(out.result.form_id, "f1");
});
