import { assertEquals } from "@std/assert";
import { ACCOUNT_BASE, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/envelope-form-data-get.ts";

Deno.test("envelope-form-data-get: GETs /envelopes/{id}/form_data", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      envelopeId: "e1",
      recipientFormData: [{ formData: [{ name: "Company", value: "Acme" }] }],
    },
  }]);
  const out = await action.execute({ envelopeId: "e1" }, ctx) as {
    recipientFormData: Array<{ formData: Array<{ value: string }> }>;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes/e1/form_data`);
  assertEquals(out.recipientFormData[0].formData[0].value, "Acme");
});

Deno.test("envelope-form-data-get: takes only the envelope id — the endpoint has one shape", () => {
  assertEquals((action.params ?? []).map((p) => p.key), ["envelopeId"]);
  assertEquals(action.type, "read");
});

Deno.test("envelope-form-data-get: sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ envelopeId: "e1" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
