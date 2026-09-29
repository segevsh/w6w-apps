import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-create-from-docx.ts";

Deno.test("submission-create-from-docx: sends the parsed documents, submitters and variables", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute!({
    documents: '[{"name":"A","file":"base64=="}]',
    submitters: '[{"role":"First Party"}]',
    variables: '{"customer_name":"Acme"}',
  }, ctx);
  assertEquals(calls[0].url, "https://api.docuseal.com/submissions/docx");
  assertEquals(
    JSON.parse(calls[0].body!),
    {
      documents: [{ name: "A", file: "base64==" }],
      submitters: [{ role: "First Party" }],
      variables: { customer_name: "Acme" },
    },
  );
});
