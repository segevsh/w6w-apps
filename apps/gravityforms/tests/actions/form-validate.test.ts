import { assert, assertEquals } from "@std/assert";
import { BASE_PATH, bodyOf, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-validate.ts";

const inputValues = { input_3: "not-an-email" };

Deno.test("form-validate: POSTs to /forms/{id}/submissions/validation", async () => {
  const { ctx, calls } = mockCtx([{ body: { is_valid: false } }], { display: DISPLAY });
  await action.execute!({ formId: 30, inputValues }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/30/submissions/validation`);
});

Deno.test("form-validate: sends input values at the top level of the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { is_valid: false } }], { display: DISPLAY });
  await action.execute!({ formId: 30, inputValues }, ctx);
  assertEquals(bodyOf(calls), inputValues);
});

Deno.test("form-validate: maps the optional multi-page and dynamic-population properties", async () => {
  const { ctx, calls } = mockCtx([{ body: { is_valid: true } }], { display: DISPLAY });
  await action.execute!({
    formId: 30,
    inputValues,
    fieldValues: { utm: "spring" },
    sourcePage: 2,
    targetPage: 3,
  }, ctx);
  const body = bodyOf(calls);
  assertEquals(body.field_values, { utm: "spring" });
  assertEquals(body.source_page, 2);
  assertEquals(body.target_page, 3);
});

Deno.test("form-validate: returns the validation verdict verbatim", async () => {
  const { ctx } = mockCtx([{
    body: { is_valid: false, validation_messages: { "3": "Enter a valid email address." } },
  }], { display: DISPLAY });
  const out = await action.execute!({ formId: 30, inputValues }, ctx) as { is_valid: boolean };
  assertEquals(out.is_valid, false);
});

Deno.test("form-validate: is side-effect free, so it is declared idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assert(action.output);
});
