import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/document-create.ts";

Deno.test("document-create: POSTs /documents with snake_case body and drops unset fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "9", key: "k", fields: [] } }]);
  const out = await action.execute(
    {
      name: "1040 EZ",
      type: "html",
      output: "pdf",
      outputName: "From {$FirstName}",
      html: "<h1>{$FirstName}</h1>",
      sizeWidth: 8.5,
    } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "POST");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/documents");
  assertEquals(JSON.parse(call.body!), {
    "name": "1040 EZ",
    "type": "html",
    "output": "pdf",
    "output_name": "From {$FirstName}",
    "html": "<h1>{$FirstName}</h1>",
    "size_width": 8.5,
  });
  assertEquals("folder" in JSON.parse(call.body!), false);
  assertEquals("file_url" in JSON.parse(call.body!), false);
  assert(out !== null);
});

Deno.test("document-create: idempotent flag is false", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("document-create: declares key, type and a description", () => {
  assertEquals(action.key, "document-create");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
