import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-create-from-pdf.ts";

Deno.test("template-create-from-pdf: sends the parsed documents array and flags", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute!({
    name: "Test PDF",
    documents: '[{"name":"A","file":"base64=="}]',
    flatten: true,
    removeTags: false,
  }, ctx);
  assertEquals(calls[0].url, "https://api.docuseal.com/templates/pdf");
  assertEquals(
    JSON.parse(calls[0].body!),
    {
      name: "Test PDF",
      documents: [{ name: "A", file: "base64==" }],
      flatten: true,
      remove_tags: false,
    },
  );
});

/** The vendor default (remove_tags: true) is honest — leaving it unset omits the field. */
Deno.test("template-create-from-pdf: removeTags at its default is not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute!({ documents: "[]" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { documents: [] });
});
