import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-create-from-template.ts";

Deno.test("document-create-from-template: POSTs template_id, recipients and template_fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "d2", template_id: "t1" } }]);
  const out = await action.execute!({
    template_id: "t1",
    recipients: [{ id: "1", placeholder_name: "Client", name: "A", email: "a@b.test" }],
    template_fields: [{ api_id: "Name", value: "Acme" }],
    test_mode: true,
  }, ctx);
  assertEquals(out, { id: "d2", template_id: "t1" });
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/document_templates/documents");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    template_id: "t1",
    recipients: [{ id: "1", placeholder_name: "Client", name: "A", email: "a@b.test" }],
    template_fields: [{ api_id: "Name", value: "Acme" }],
    test_mode: true,
  });
});

Deno.test("document-create-from-template: accepts template_ids instead of template_id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "d3" } }]);
  await action.execute!({ template_ids: '["t1","t2"]', recipients: [{ id: "1" }] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).template_ids, ["t1", "t2"]);
});

Deno.test("document-create-from-template: needs a template and recipients before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ recipients: [{ id: "1" }] }, ctx),
    Error,
    "template_id",
  );
  await assertRejects(
    async () => await action.execute!({ template_id: "t" }, ctx),
    Error,
    "`recipients`",
  );
  assertEquals(calls.length, 0);
});
