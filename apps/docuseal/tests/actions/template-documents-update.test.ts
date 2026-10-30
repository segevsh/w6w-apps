import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-documents-update.ts";

test("template-documents-update: sends the parsed documents array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute!({ id: 1, documents: '[{"name":"A","file":"base64=="}]' }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.docuseal.com/templates/1/documents");
  assertEquals(JSON.parse(calls[0].body!), { documents: [{ name: "A", file: "base64==" }] });
});

test("template-documents-update: merge is only sent when true", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute!({ id: 1, documents: "[]", merge: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { documents: [], merge: true });
});

test("template-documents-update: documents is required", async () => {
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
