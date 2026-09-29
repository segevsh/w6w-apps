import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-create-from-html.ts";

Deno.test("submission-create-from-html: sends the parsed documents and submitters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute!({
    documents: '[{"name":"A","html":"<p>A</p>"}]',
    submitters: '[{"role":"First Party"}]',
  }, ctx);
  assertEquals(calls[0].url, "https://api.docuseal.com/submissions/html");
  assertEquals(
    JSON.parse(calls[0].body!),
    { documents: [{ name: "A", html: "<p>A</p>" }], submitters: [{ role: "First Party" }] },
  );
});
