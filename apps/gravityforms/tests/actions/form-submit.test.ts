import { assert, assertEquals } from "@std/assert";
import { BASE_PATH, bodyOf, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-submit.ts";

const inputValues = { input_1_3: "Neil", input_1_6: "Armstrong", input_3: "neil@example.com" };

Deno.test("form-submit: POSTs to /forms/{id}/submissions — not /entries", async () => {
  const { ctx, calls } = mockCtx([{ body: { is_valid: true, entry_id: 159 } }], {
    display: DISPLAY,
  });
  const out = await action.execute!({ formId: 30, inputValues }, ctx) as { entry_id: number };
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/30/submissions`);
  assertEquals(out.entry_id, 159);
});

Deno.test("form-submit: sends input values at the top level of the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { is_valid: true } }], { display: DISPLAY });
  await action.execute!({ formId: 30, inputValues }, ctx);
  assertEquals(bodyOf(calls), inputValues);
});

Deno.test("form-submit: maps the optional properties onto their documented snake_case keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { is_valid: true } }], { display: DISPLAY });
  await action.execute!({
    formId: 30,
    inputValues,
    fieldValues: { utm: "spring" },
    sourcePage: 1,
    targetPage: 2,
  }, ctx);
  const body = bodyOf(calls);
  assertEquals(body.field_values, { utm: "spring" });
  assertEquals(body.source_page, 1);
  assertEquals(body.target_page, 2);
});

Deno.test("form-submit: omits the optional properties when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { is_valid: true } }], { display: DISPLAY });
  await action.execute!({ formId: 30, inputValues }, ctx);
  const body = bodyOf(calls);
  assert(!("field_values" in body));
  assert(!("source_page" in body));
  assert(!("target_page" in body));
});

Deno.test("form-submit: a validation failure is a 200 answer, not an error", async () => {
  const { ctx } = mockCtx([{
    body: { is_valid: false, validation_messages: { "3": "Enter a valid email address." } },
  }], { display: DISPLAY });
  const out = await action.execute!({ formId: 30, inputValues: {} }, ctx) as {
    is_valid: boolean;
    validation_messages: Record<string, string>;
  };
  assertEquals(out.is_valid, false);
  assertEquals(out.validation_messages["3"], "Enter a valid email address.");
});

Deno.test("form-submit: logs the submission and is declared non-idempotent", async () => {
  const { ctx, logs } = mockCtx([{ body: { is_valid: true } }], { display: DISPLAY });
  await action.execute!({ formId: 30, inputValues }, ctx);
  assertEquals(logs[0].level, "info");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
