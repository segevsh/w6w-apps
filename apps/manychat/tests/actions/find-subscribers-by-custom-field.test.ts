import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import findSubscribersByCustomField from "../../actions/find-subscribers-by-custom-field.ts";

Deno.test("find-subscribers-by-custom-field: sends field_id and field_value", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [] } }]);
  await findSubscribersByCustomField.execute!({ fieldId: "12", fieldValue: "pro" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/fb/subscriber/findByCustomField");
  assertEquals(url.searchParams.get("field_id"), "12");
  assertEquals(url.searchParams.get("field_value"), "pro");
});

Deno.test("find-subscribers-by-custom-field: the value is NOT coerced", async () => {
  // Manychat types this query parameter as a string even for Number fields, so
  // coerceFieldValue (which is for JSON body values) deliberately does not run.
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [] } }]);
  await findSubscribersByCustomField.execute!({ fieldId: "1", fieldValue: "42" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("field_value"), "42");
});

Deno.test("find-subscribers-by-custom-field: warns that only Text and Number work", () => {
  const d = findSubscribersByCustomField.description!;
  assert(/text and number/i.test(d), d);
});

Deno.test("find-subscribers-by-custom-field: offers no by-name variant — none exists", () => {
  const keys = (findSubscribersByCustomField.params ?? []).map((p) => p.key);
  assertEquals(keys, ["fieldId", "fieldValue"]);
});
