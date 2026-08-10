import { assert, assertEquals } from "@std/assert";
import formSubmit from "../../actions/form-submit.ts";
import { bodyOf, doc, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-submit: POSTs a form_submissions document to the submit route", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: doc("2", "form_submissions") }]);
  await formSubmit.execute({ formId: "8", name: "Jo", email: "jo@x.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/v1/forms/8/submit");

  const body = bodyOf(calls[0]) as {
    data: { type: string; attributes: Record<string, unknown> };
  };
  assertEquals(body.data.type, "form_submissions");
  assertEquals(body.data.attributes.name, "Jo");
  assertEquals(body.data.attributes.email, "jo@x.com");
});

Deno.test("form-submit: custom fields merge into the submission attributes", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: doc("2", "form_submissions") }]);
  await formSubmit.execute(
    { formId: "8", email: "jo@x.com", customFields: '{"custom_1": "Webinar"}' },
    ctx,
  );
  const attrs = (bodyOf(calls[0]) as { data: { attributes: Record<string, unknown> } })
    .data.attributes;
  assertEquals(attrs.custom_1, "Webinar");
});

/**
 * `form_submission_attributes` is the contact attribute set MINUS `subscribed`
 * and `external_user_id`. Neither is offered, because neither is in the schema.
 */
Deno.test("form-submit: offers only the attributes the submission schema declares", () => {
  const keys = formSubmit.params!.map((p) => p.key);
  assertEquals(keys.includes("subscribed"), false);
  assertEquals(keys.includes("externalUserId"), false);
});

/**
 * Every call is a new submission event that re-fires the creator's automations
 * — potentially a second welcome email to the same person. There is no dedupe
 * key in the schema, so the runtime must not retry this silently.
 */
Deno.test("form-submit: is not idempotent, so the runtime will not silently retry", () => {
  assertEquals(formSubmit.idempotent, false);
});

/** The whole point of choosing this over `contact-create` is the automation. */
Deno.test("form-submit: explains the trade-off against contact-create", () => {
  assert(formSubmit.description!.includes("contact-create"));
});

Deno.test("form-submit: a form id with a slash is percent-encoded", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: doc() }]);
  await formSubmit.execute({ formId: "a/b", email: "jo@x.com" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/forms/a%2Fb/submit");
});
