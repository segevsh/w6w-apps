import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-create.ts";

Deno.test("template-create: POSTs files and placeholders to /document_templates", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "t1", name: "NDA" } }]);
  const out = await action.execute!({
    files: [{ name: "n.pdf", file_base64: "QUJD" }],
    placeholders: '[{"id":"1","name":"Client"}]',
    name: "NDA",
    draft: true,
  }, ctx);
  assertEquals(out, { id: "t1", name: "NDA" });
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/document_templates");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    files: [{ name: "n.pdf", file_base64: "QUJD" }],
    placeholders: [{ id: "1", name: "Client" }],
    name: "NDA",
    draft: true,
  });
  assertEquals(action.idempotent, false);
});

Deno.test("template-create: files and placeholders are required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ placeholders: [] }, ctx),
    Error,
    "`files`",
  );
  await assertRejects(
    async () => await action.execute!({ files: [] }, ctx),
    Error,
    "`placeholders`",
  );
  assertEquals(calls.length, 0);
});
