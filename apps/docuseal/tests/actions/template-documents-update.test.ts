import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-documents-update.ts";

Deno.test("template-documents-update: sends the parsed documents array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute!({ id: 1, documents: '[{"name":"A","file":"base64=="}]' }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.docuseal.com/templates/1/documents");
  assertEquals(JSON.parse(calls[0].body!), { documents: [{ name: "A", file: "base64==" }] });
});

Deno.test("template-documents-update: merge is only sent when true", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute!({ id: 1, documents: "[]", merge: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { documents: [], merge: true });
});

Deno.test("template-documents-update: documents is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await action.execute!({ id: 1 }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});
