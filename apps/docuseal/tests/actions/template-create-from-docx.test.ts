import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-create-from-docx.ts";

Deno.test("template-create-from-docx: sends the parsed documents array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, name: "Test DOCX" } }]);
  await action.execute!({ name: "Test DOCX", documents: '[{"name":"A","file":"base64=="}]' }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.docuseal.com/templates/docx");
  assertEquals(
    JSON.parse(calls[0].body!),
    { name: "Test DOCX", documents: [{ name: "A", file: "base64==" }] },
  );
});

Deno.test("template-create-from-docx: documents is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await action.execute!({ name: "Test" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});
