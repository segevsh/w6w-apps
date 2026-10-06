import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/document-file-get.ts";

Deno.test("document-file-get: GETs /documents/{id}/file", async () => {
  const { ctx, calls } = mockCtx([{
    body: { type: "pdf", last_update: "2015-03-24 16:34:20", contents: "JVBERg==" },
  }]);
  const out = await action.execute({ id: "436346" } as never, ctx) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "GET");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/documents/436346/file");
  assertEquals(call.body, null);
  assert(out !== null);
});

Deno.test("document-file-get: declares key, type and a description", () => {
  assertEquals(action.key, "document-file-get");
  assertEquals(action.type, "read");
  assert(action.description!.length > 10);
});
