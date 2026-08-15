import { assertEquals, assertThrows } from "@std/assert";
import formSubmissionCreate from "../../actions/form-submission-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-submission-create: POSTs form_data parsed from a JSON string param", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "FOR1", company_id: "COM1" } }]);
  const out = await formSubmissionCreate.execute(
    {
      accountId: "ACC1",
      companyId: "COM1",
      formUrl: "https://example.com/contact",
      formData: '{"name":"Graham"}',
      sessionId: "sess1",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/form_submissions.json");
  assertEquals(JSON.parse(calls[0].body!), {
    company_id: "COM1",
    form_url: "https://example.com/contact",
    form_data: { name: "Graham" },
    session_id: "sess1",
  });
  assertEquals(out, { id: "FOR1", company_id: "COM1" });
});

Deno.test("form-submission-create: also accepts form_data already parsed as an object", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await formSubmissionCreate.execute(
    {
      accountId: "ACC1",
      companyId: "COM1",
      formUrl: "https://example.com",
      formData: { name: "Graham" },
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).form_data, { name: "Graham" });
});

Deno.test("form-submission-create: invalid JSON in form_data fails before any network call", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => {
    formSubmissionCreate.execute(
      { accountId: "ACC1", companyId: "COM1", formUrl: "https://example.com", formData: "{oops" },
      ctx,
    );
  });
  assertEquals(calls.length, 0);
});
