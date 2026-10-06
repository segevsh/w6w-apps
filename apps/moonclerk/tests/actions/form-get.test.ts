import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/form-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("form-get: GET /forms/:id and unwraps form", async () => {
  const { ctx, calls } = mockCtx([{ body: { form: { id: 234456, title: "Monthly" } } }]);
  const out = await action.execute!({ formId: 234456 }, ctx);
  assertEquals(calls[0].url, "https://api.moonclerk.com/forms/234456");
  assertEquals(out, { form: { id: 234456, title: "Monthly" } });
});

Deno.test("form-get: a body without a form object is an error", async () => {
  const { ctx } = mockCtx([{ body: { forms: [] } }]);
  await assertRejects(
    async () => await action.execute!({ formId: 1 }, ctx),
    Error,
    'no "form" object',
  );
});

Deno.test("form-get: a 404 is thrown with its status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "Not Found" }]);
  await assertRejects(async () => await action.execute!({ formId: 9 }, ctx), Error, "HTTP 404");
});
