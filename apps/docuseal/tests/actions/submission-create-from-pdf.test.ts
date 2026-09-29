import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-create-from-pdf.ts";

Deno.test("submission-create-from-pdf: sends the parsed documents and submitters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute!({
    documents: '[{"name":"A","file":"base64=="}]',
    submitters: '[{"role":"First Party"}]',
  }, ctx);
  assertEquals(calls[0].url, "https://api.docuseal.com/submissions/pdf");
  assertEquals(
    JSON.parse(calls[0].body!),
    { documents: [{ name: "A", file: "base64==" }], submitters: [{ role: "First Party" }] },
  );
});

Deno.test("submission-create-from-pdf: at least one submitter is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await action.execute!({ documents: "[]", submitters: "[]" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});
